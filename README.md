# This repo is no longer in use and has been archived
# AWS Rambler Migrator

An example of running [rambler](https://github.com/elwinar/rambler) migrations on deploy with the CDK.

This project sets up:

- a VPC
- an RDS Aurora Serverless cluster
- alternative 1: a Lambda function in the VPC with access to the cluster
- alternative 2: an ECS/Fargate task definition in the VPC with access to the cluster

## Lambda Migrator

The lambda migrator is an AWS NodeJS docker with rambler added. The lambda is triggered using a "Custom Resource" on deploy.

To avoid exposing passwords via environment variables there's a thin NodeJS wrapper that fetches the password from secrets manager and passes it to Rambler.

## ECS Migrator

The ECS migrator is a Fargate task built from a vanilla alpine docker with rambler added. It is triggered on deploy using the [cdk-fargate-run-task](https://constructs.dev/packages/cdk-fargate-run-task/v/0.1.165?lang=typescript) package (which most likely uses a custom resource, i.e. lambda, under the hood) which runs a one time task.

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
