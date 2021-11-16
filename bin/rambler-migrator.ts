#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { LambdaRamblerMigrator } from "../lib/lambda-rambler-migrator";
import { VpcStack } from "../lib/vpc";
import { RdsStack } from "../lib/rds";
import { EcsRamblerMigrator } from "../lib/ecs-rambler-migrator";

const app = new cdk.App();

const vpcStack = new VpcStack(app, "VpcStack", {});

const rds = new RdsStack(app, "RDS", vpcStack.vpc, {});

new EcsRamblerMigrator(
  app,
  "EcsRamblerMigrator",
  vpcStack.vpc,
  rds.cluster,
  {}
);

new LambdaRamblerMigrator(
  app,
  "LambdaRamblerMigrator",
  vpcStack.vpc,
  rds.cluster,
  {}
);
