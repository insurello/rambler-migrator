import { IVpc, Port } from "@aws-cdk/aws-ec2";
import { DockerImageAsset } from "@aws-cdk/aws-ecr-assets";
import * as ecs from "@aws-cdk/aws-ecs";
import { LogGroup, RetentionDays } from "@aws-cdk/aws-logs";
import { ServerlessCluster } from "@aws-cdk/aws-rds";
import * as cdk from "@aws-cdk/core";
import { RunTask } from "cdk-fargate-run-task";
import * as path from "path";

export class EcsRamblerMigrator extends cdk.Stack {
  constructor(
    scope: cdk.Construct,
    id: string,
    vpc: IVpc,
    rdsCluster: ServerlessCluster
  ) {
    super(scope, id);

    const ecsCluster = new ecs.Cluster(this, "RamblerMigratorCluster", {
      vpc,
      clusterName: "rambler-migrator",
    });

    const asset = new DockerImageAsset(this, "EcsDockerImage", {
      directory: path.join(__dirname, "../"),
      file: "Dockerfile.ecs",
    });

    const dbHost = rdsCluster.clusterEndpoint.hostname;
    const dbUser = ecs.Secret.fromSecretsManager(
      rdsCluster.secret!,
      "username"
    );
    const dbPassword = ecs.Secret.fromSecretsManager(
      rdsCluster.secret!,
      "password"
    );

    const task = new ecs.FargateTaskDefinition(this, "RamblerMigratorTask", {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    task.addContainer("RamblerDocker", {
      image: ecs.ContainerImage.fromDockerImageAsset(asset),
      environment: {
        DB_HOST: dbHost,
        RAMBLER_HOST: dbHost,
      },
      secrets: {
        DB_PASSWORD: dbPassword,
        DB_USERNAME: dbUser,
        RAMBLER_PASSWORD: dbPassword,
        RAMBLER_USER: dbUser,
      },
      logging: new ecs.AwsLogDriver({
        streamPrefix: "RamblerMigrator",
        logGroup: new LogGroup(this, "RamblerMigrator", {
          logGroupName: `${id}-RamblerMigrator`,
          retention: RetentionDays.ONE_DAY,
        }),
      }),
    });

    const runTask = new RunTask(
      this,
      `RunTaskOnce-${new Date().toISOString()}`,
      {
        task,
        cluster: ecsCluster,
      }
    );

    runTask.connections.allowTo(
      rdsCluster,
      Port.tcp(rdsCluster.clusterEndpoint.port)
    );
  }
}
