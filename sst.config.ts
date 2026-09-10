/// <reference path="./.sst/platform/config.d.ts" />

/**
 * The entire AWS footprint.
 *
 * ⚠️ **Not typechecked or linted in CI**: the `$config`, `sst` and `aws` globals
 * are generated into the gitignored `.sst/platform` by `npx sst install`, so a
 * clean checkout has no types for them. Excluded in `tsconfig.json` and
 * `eslint.config.mjs`; reviewed by hand instead. Run `npx sst install` once
 * locally and your editor will type it properly.
 *
 * ⚠️ **The app name must stay `five-crowns`.** `infra/github-oidc.yaml` scopes
 * IAM to `role/five-crowns-*`, and SST names the roles it creates after the app.
 * Any other name fails with an IAM denial that reads like something else.
 *
 * **REGION — settled.** `ap-southeast-2` (Sydney): the founder and players are in
 * Australia. The earlier `eu-west-2` (London) choice rested on a false premise
 * about where they live and was corrected before anything was provisioned — see
 * the region-correction ADR in `docs/DECISIONS.md` (2026-09-10).
 * ⚠️ The ACM certificate for CloudFront is still issued in **us-east-1**,
 * whatever region the app runs in. That is not a mistake.
 */

const APP = "five-crowns";
const REGION = "ap-southeast-2";

/** The permanent photo bucket, named in docs/ARCHITECTURE.md § Backups. */
const PHOTOS_BUCKET = "five-crowns-photos";

/** How long a nightly dump is kept. Photos themselves are kept forever. */
const BACKUP_RETENTION_DAYS = 90;

export default $config({
  app(input) {
    return {
      name: APP,
      // ⚠️ prod is retained on removal. There is one environment and it holds
      // the only copy of a decade of games.
      removal: input?.stage === "prod" ? "retain" : "remove",
      protect: input?.stage === "prod",
      home: "aws",
      providers: {
        aws: { region: REGION },
      },
    };
  },

  async run() {
    const stage = $app.stage;
    const parameterPrefix = `/${APP}/${stage}`;

    /* ------------------------------------------------------------ storage */

    /**
     * Photos, column close-ups and the nightly database dumps.
     *
     * ⚠️ **Versioning on, and no delete lifecycle on the photos.** Everyone
     * shares one password and the PRD lets anyone delete a saved game, so an
     * accidental or malicious deletion has to be recoverable. The only
     * expiry rule below is scoped to the `backups/` prefix.
     */
    const photos = new sst.aws.Bucket("Photos", {
      versioning: true,
      // Private. Access is by 5-minute presigned URL only, so a copied image
      // link is not a permanent hole in the gate.
      access: undefined,
      transform: {
        bucket: {
          bucket: PHOTOS_BUCKET,
        },
      },
    });

    new aws.s3.BucketLifecycleConfigurationV2("PhotosLifecycle", {
      bucket: photos.name,
      rules: [
        {
          id: "expire-database-backups",
          status: "Enabled",
          // ⚠️ Scoped to backups/ ONLY. Nothing here may ever expire a photo.
          filter: { prefix: "backups/" },
          expiration: { days: BACKUP_RETENTION_DAYS },
          noncurrentVersionExpiration: { noncurrentDays: BACKUP_RETENTION_DAYS },
        },
        {
          // Housekeeping only: abandoned multipart uploads are not objects and
          // are invisible in the console while still costing storage.
          id: "abort-incomplete-uploads",
          status: "Enabled",
          filter: {},
          abortIncompleteMultipartUpload: { daysAfterInitiation: 7 },
        },
      ],
    });

    /* ----------------------------------------------------------- database */

    // Needed to deploy and migrate, so SST owns them (docs/ARCHITECTURE.md
    // § Environments and configuration). Set once with:
    //   npx sst secret set TURSO_DATABASE_URL '<url>' --stage prod
    const tursoUrl = new sst.Secret("TURSO_DATABASE_URL");
    const tursoToken = new sst.Secret("TURSO_AUTH_TOKEN");

    /* ------------------------------------------------------------ secrets */

    /**
     * The cookie signing key.
     *
     * Created by hand before the first deploy — `scripts/deploy.sh` refuses to
     * deploy without it — and read here so it can be injected at cold start.
     * ⚠️ Never in code, never in the database, never in the browser bundle.
     */
    const sessionSecret = aws.ssm.getParameterOutput({
      name: `${parameterPrefix}/session-secret`,
      withDecryption: true,
    }).value;

    /**
     * The parameters the **app** owns — the two password hashes, the two
     * session epochs and the Anthropic API key — are deliberately *not*
     * declared here. They are written by the founder from the admin panel or by
     * hand during setup, and a deploy that could set them would reintroduce the
     * first-run land-grab the design exists to avoid.
     */
    const appParameterArn = $interpolate`arn:aws:ssm:${REGION}:${aws.getCallerIdentityOutput({}).accountId}:parameter${parameterPrefix}/*`;

    const parameterAccess = [
      {
        actions: [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath",
          "ssm:PutParameter",
        ],
        resources: [appParameterArn],
      },
      {
        // SecureStrings use the AWS-managed aws/ssm key. ⚠️ A customer-managed
        // key would be $1/month, so we deliberately do not create one.
        actions: [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:DescribeKey",
          "kms:GenerateDataKey",
        ],
        resources: ["*"],
        // Scoped by the service the request came through rather than by key
        // ARN, which is not knowable for an AWS-managed key at deploy time.
        // (Pulumi passes conditions through unchanged.)
      },
    ];

    /* ---------------------------------------------------- the app itself */

    /**
     * The custom domain is attached only when both parameters are present, so
     * the first deploy is never blocked on DNS and a mistyped record can never
     * take the app down — the CloudFront URL keeps working alongside it.
     *
     * ⚠️ `dns: false` on purpose. DNS for ribenajuice.xyz is managed in
     * Lightsail, and no Route 53 hosted zone is created: that is the difference
     * between $0.50/month forever and $0.00, and it is the last line in the
     * design that would bill while nobody is using the app.
     * ⚠️ The certificate must be issued in **us-east-1**, whatever region the
     * app runs in. CloudFront accepts nothing else.
     */
    const appDomain = process.env.APP_DOMAIN;
    const appCertArn = process.env.APP_CERT_ARN;
    const domain =
      appDomain && appCertArn
        ? { name: appDomain, dns: false as const, cert: appCertArn }
        : undefined;

    const web = new sst.aws.Nextjs("Web", {
      link: [photos, tursoUrl, tursoToken],
      ...(domain ? { domain } : {}),
      environment: {
        CONFIG_SOURCE: "ssm",
        STAGE: stage,
        SESSION_SECRET: sessionSecret,
        TURSO_DATABASE_URL: tursoUrl.value,
        TURSO_AUTH_TOKEN: tursoToken.value,
        PHOTOS_BUCKET: photos.name,
        // Non-secret config lives here, not in Parameter Store.
        DAILY_SHEET_CAP: "20",
        DAILY_COLUMN_CAP: "60",
      },
      server: {
        architecture: "arm64",
        // A vision call with adaptive thinking over a photograph takes tens of
        // seconds. 120 s of Lambda, 60 s of CloudFront origin read timeout.
        timeout: "120 seconds",
        memory: "1024 MB",
        permissions: parameterAccess,
      },
      transform: {
        // ⚠️ CloudFront's default 30 s origin read timeout would cut off a
        // vision call. /api/transcribe streams a progress event immediately so
        // the timeout never comes into play, but this is the belt to that pair
        // of braces.
        //
        // ⚠️ UNVERIFIED: this transform has never been run — no deploy has been
        // attempted (the AWS account is still being settled with the founder).
        // Wrapped in $output so it works whether `origins` arrives as a plain
        // array or as a Pulumi Output, but the first `sst deploy` should check
        // the distribution's origin timeout really is 60 and not 30.
        cdn: (args) => {
          args.origins = $output(args.origins).apply((origins) =>
            origins.map((origin) =>
              origin.customOriginConfig
                ? {
                    ...origin,
                    customOriginConfig: {
                      ...origin.customOriginConfig,
                      originReadTimeout: 60,
                      originKeepaliveTimeout: 60,
                    },
                  }
                : origin,
            ),
          );
        },
      },
    });

    /* ------------------------------------------------------ nightly dump */

    /**
     * PRD criterion 83: the dump lands in
     * `s3://five-crowns-photos/backups/YYYY-MM-DD.sql`.
     *
     * 14:15 UTC is a quarter past midnight in Sydney — after any game night has
     * been written up, and nowhere near a deploy.
     */
    new sst.aws.Cron("NightlyBackup", {
      schedule: "cron(15 14 * * ? *)",
      function: {
        handler: "lib/backup/handler.handler",
        architecture: "arm64",
        timeout: "5 minutes",
        memory: "512 MB",
        link: [photos, tursoUrl, tursoToken],
        environment: {
          PHOTOS_BUCKET: photos.name,
          TURSO_DATABASE_URL: tursoUrl.value,
          TURSO_AUTH_TOKEN: tursoToken.value,
        },
        permissions: [
          {
            actions: ["s3:PutObject"],
            resources: [$interpolate`${photos.arn}/backups/*`],
          },
        ],
      },
    });

    /* ------------------------------------------------------------- budget */

    /**
     * PRD criterion 86: a zero-spend alarm, so any surprise arrives by email
     * rather than by statement. Expected running cost is about A$0.65/month,
     * effectively all of it Anthropic usage.
     *
     * AWS's own zero-spend template is a $0.01 budget notifying at 100% of
     * actual spend. The first two budgets are free.
     *
     * The address comes from `/five-crowns/{stage}/budget-alert-email`, exported
     * by `scripts/deploy.sh` — a budget with no subscriber is not an alarm.
     */
    const budgetEmail = process.env.BUDGET_ALERT_EMAIL;
    if (budgetEmail) {
      new aws.budgets.Budget("ZeroSpend", {
        name: `${APP}-${stage}-zero-spend`,
        budgetType: "COST",
        limitAmount: "0.01",
        limitUnit: "USD",
        timeUnit: "MONTHLY",
        notifications: [
          {
            comparisonOperator: "GREATER_THAN",
            threshold: 100,
            thresholdType: "PERCENTAGE",
            notificationType: "ACTUAL",
            subscriberEmailAddresses: [budgetEmail],
          },
          {
            comparisonOperator: "GREATER_THAN",
            threshold: 100,
            thresholdType: "PERCENTAGE",
            notificationType: "FORECASTED",
            subscriberEmailAddresses: [budgetEmail],
          },
        ],
      });
    } else {
      console.warn(
        "⚠️  No BUDGET_ALERT_EMAIL — the zero-spend budget alarm was NOT created.\n" +
          `    aws ssm put-parameter --region ${REGION} --overwrite --type String \\\n` +
          `      --name ${parameterPrefix}/budget-alert-email --value 'you@example.com'`,
      );
    }

    return {
      url: web.url,
      photosBucket: photos.name,
      region: REGION,
    };
  },
});
