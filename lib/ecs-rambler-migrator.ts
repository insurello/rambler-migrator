import { IVpc, Port } from "@aws-cdk/aws-ec2";
import { DockerImageAsset } from "@aws-cdk/aws-ecr-assets";
import * as ecs from "@aws-cdk/aws-ecs";
import { LogGroup, RetentionDays } from "@aws-cdk/aws-logs";
import { ServerlessCluster } from "@aws-cdk/aws-rds";
import * as cdk from "@aws-cdk/core";
import { RunTask } from "cdk-fargate-run-task";
import * as path from "path";

export class EcsRamblerMigrator extends cdk.Construct {
  constructor(
    scope: cdk.Construct,
    id: string,
    vpc: IVpc,
    dbCluster: ServerlessCluster
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

    const dbHost = dbCluster.clusterEndpoint.hostname;
    const dbUser = ecs.Secret.fromSecretsManager(dbCluster.secret!, "username");
    const dbPassword = ecs.Secret.fromSecretsManager(
      dbCluster.secret!,
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

    ecsCluster.connections.allowTo(
      dbCluster.connections,
      Port.tcp(dbCluster.clusterEndpoint.port)
    );

    const runTaskAtOnce = new RunTask(this, "RunDemoTaskOnce", {
      task,
      cluster: ecsCluster,
    });
  }
}
