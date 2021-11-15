# AWS Rambler Migrator

An example of running rambler migrations on deploy with the CDK.

This project sets up:

- a VPC
- an RDS Aurora Serverless cluster
- a lambda function in the VPC with access to the cluster

## Lambda Migrator

The lambda migrator is a vanilla Alpine docker with curl (for Lambda interaction) and rambler added. The lambda is triggered using a "Custom Resource" on deploy.

N.B.! The RDS secrets are exposed via environment variables to the Lambda, this means anyone who is allowed to look at the lambda will also gain access to those secrets.

Possible improvements:

- use a programming language stack to access the secrets and call rambler (e.g. NodeJS or similar)

## CDK

Based on the blank TS template.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

### Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template
