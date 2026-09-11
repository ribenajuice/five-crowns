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
 * **SST v4** (`package.json` pins `sst` ^4.17.1, Pulumi AWS provider v7). Two v4
 * facts this file depends on, checked against the v4.17.1 source:
 *  - `Nextjs` takes `permissions` at the **top level**. There is no
 *    `server.permissions`; a grant put there is silently ignored.
 *  - CloudFront's origin read timeout is derived from `server.timeout`. There
 *    is no separate knob, and transforming `cdn.origins` only reaches a
 *    placeholder origin.
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

/**
 * The parameters the **app** owns — `lib/config/parameters.ts` and the table
 * in `lib/config/README.md`. These five are the only parameters the web
 * Lambda may read or write. The session secret is not among them: it is read
 * at deploy time and injected as `SESSION_SECRET`, so the running app never
 * needs Parameter Store access to it.
 */
const APP_PARAMETERS = [
  "group-password-hash",
  "admin-password-hash",
  "group-session-epoch",
  "admin-session-epoch",
  "anthropic-api-key",
];

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
    const accountId = aws.getCallerIdentityOutput({}).accountId;

    /* ------------------------------------------------------------ storage */

    /**
     * Photos and column close-ups. Nothing else lives here: database backups
     * are manual and local (`npm run db:backup`; ADR 2026-09-11).
     *
     * ⚠️ **Versioning on, public access blocked, and no delete lifecycle.**
     * Everyone shares one password and the PRD lets anyone delete a saved
     * game, so an accidental or malicious deletion has to be recoverable.
     * No `access` option means private: SST's public-access block sets all
     * four blocks. Photos are served by 5-minute presigned URL only, so a
     * copied image link is not a permanent hole in the gate.
     *
     * ⚠️ **Never `link` this bucket.** SST's Bucket link grants `s3:*` on the
     * bucket and every object — including deleting old versions, suspending
     * versioning, and rewriting the lifecycle rules and the public-access
     * block. Grants are written out by hand in `permissions` below.
     */
    const photos = new sst.aws.Bucket("Photos", {
      versioning: true,
      // Explicit, not SST's default (`*` origins, every method). Browsers upload
      // with presigned POSTs and display with presigned GETs, from the one
      // address the app has. The URL itself is the authorisation, so this grants
      // nothing on its own; it just stops other sites' pages from using those
      // URLs from a browser. No `localhost`: local development never touches
      // this bucket (lib/photos local driver). Stage 2 security review, LOW 6.
      cors: {
        allowOrigins: ["https://fivecrowns.ribenajuice.xyz"],
        allowMethods: ["POST", "GET", "HEAD"],
        allowHeaders: ["*"],
      },
      transform: {
        bucket: {
          bucket: PHOTOS_BUCKET,
          // SST defaults to true. A bucket holding the only copy of the photos
          // must never be emptied as a side effect of an infrastructure change.
          forceDestroy: false,
        },
      },
    });

    // Housekeeping only. Abandoned multipart uploads are not objects: they are
    // invisible in the console while still costing storage. This rule never
    // expires an object or a version — it is not a delete lifecycle.
    // (Pulumi AWS v7 name: the `…V2` resources are deprecated.)
    new aws.s3.BucketLifecycleConfiguration("PhotosLifecycle", {
      bucket: photos.name,
      rules: [
        {
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
     * The app-owned parameters are deliberately *not* declared here. They are
     * written by the founder from the admin panel or by hand during setup, and
     * a deploy that could set them would reintroduce the first-run land-grab
     * the design exists to avoid.
     */
    const appParameterArns = APP_PARAMETERS.map(
      (name) =>
        $interpolate`arn:aws:ssm:${REGION}:${accountId}:parameter${parameterPrefix}/${name}`,
    );

    /**
     * Everything the internet-facing Lambda may do, and nothing else.
     *
     * ⚠️ No KMS statement, on purpose. SecureStrings use the AWS-managed
     * `aws/ssm` key, whose key policy already allows any principal in this
     * account to use it *through Parameter Store only* (`kms:ViaService` +
     * `kms:CallerAccount`). An IAM grant adds nothing but a way to call KMS
     * directly. ⚠️ A customer-managed key would be $1/month, so we deliberately
     * do not create one.
     */
    const webPermissions = [
      {
        actions: ["ssm:GetParameter", "ssm:GetParameters"],
        resources: appParameterArns,
      },
      {
        // Rotating the API key and passwords, bumping session epochs.
        actions: ["ssm:PutParameter"],
        resources: appParameterArns,
      },
      {
        // Presigned upload and view URLs. ⚠️ Never s3:DeleteObject*, never
        // s3:PutBucket* / s3:PutLifecycle* / s3:PutEncryption*: the Lambda
        // cannot undo the versioning that makes a deletion recoverable.
        actions: ["s3:GetObject", "s3:PutObject"],
        resources: [$interpolate`${photos.arn}/*`],
      },
    ];

    /* ---------------------------------------------------- the app itself */

    /**
     * The custom domain is attached only when both parameters are present, so
     * the first deploy is never blocked on DNS and a mistyped record can never
     * take the app down — the CloudFront URL keeps working alongside it.
     *
     * ⚠️ `dns: false` on purpose (valid in v4: SST then requires `cert`). DNS
     * for ribenajuice.xyz is managed in Lightsail, and no Route 53 hosted zone
     * is created: that is the difference between $0.50/month forever and
     * $0.00, and it is the last line in the design that would bill while
     * nobody is using the app.
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
      // Secrets only — linking a Secret grants no IAM. ⚠️ Not `photos`: see
      // the bucket above.
      link: [tursoUrl, tursoToken],
      // ⚠️ Top level in SST v4. Under `server` this would be silently dropped.
      permissions: webPermissions,
      /**
       * ⚠️ The server function cannot be called except through CloudFront.
       * SST's default ("none") leaves its Lambda function URL public, and the
       * login rate limiter trusts `CloudFront-Viewer-Address` — a header anyone
       * could forge by calling the function URL directly.
       *
       * With this mode (checked against the SST 4.17.1 source) the function URL
       * requires IAM auth, only this distribution may invoke it (CloudFront
       * Origin Access Control), and SST's small Lambda@Edge function adds the
       * `x-amz-content-sha256` header OAC needs on POST/PUT/PATCH — which
       * browsers never send, so plain "oac" would break every login.
       *
       * Costs: <A$0.01/month (US$0.60 per million requests, no free tier);
       * request bodies through the app are capped at 1 MB (photos go to S3 by
       * presigned URL, never through a route handler); removing the stage
       * takes 5–10 minutes while the edge replicas are deleted.
       */
      protection: "oac-with-edge-signing",
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
        // seconds, and /api/transcribe streams a progress event immediately.
        //
        // In SST v4 this one value is both the Lambda timeout and CloudFront's
        // origin read timeout (set per request by SST's CloudFront Function via
        // updateRequestOrigin, which accepts up to 120 s).
        // ⚠️ UNVERIFIED until the first deploy: CloudFront's default per-origin
        // response-timeout quota is 60 s. Check a real transcription on the
        // first deploy; if it is cut off at 60 s, request the (free) quota
        // increase to 120 s, or lower this to "60 seconds".
        timeout: "120 seconds",
        memory: "1024 MB",
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
