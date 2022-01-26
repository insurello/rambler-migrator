#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { Stack } from "aws-cdk-lib";
import "source-map-support/register";
import { EcsRamblerMigrator } from "../lib/ecs-rambler-migrator";
import { LambdaRamblerMigrator } from "../lib/lambda-rambler-migrator";
import { RdsStack } from "../lib/rds";
import { VpcStack } from "../lib/vpc";

const app = new cdk.App();

const vpcStack = new VpcStack(app, "VpcStack", {});

const rds = new RdsStack(app, "RDS", vpcStack.vpc, {});

new EcsRamblerMigrator(
  new Stack(app, "EcsRamblerMigrator", {}),
  "EcsRamblerMigrator",
  vpcStack.vpc,
  rds.cluster
);

new LambdaRamblerMigrator(
  new Stack(app, "LambdaRamblerMigrator", {}),
  "LambdaRamblerMigrator",
  vpcStack.vpc,
  rds.cluster,
  {}
);
