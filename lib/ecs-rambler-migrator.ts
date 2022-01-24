import { IVpc, Port } from "aws-cdk-lib/aws-ec2";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import * as ecs from "aws-cdk-lib/aws-ecs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { ServerlessCluster } from "aws-cdk-lib/aws-rds";
import { RunTask } from "cdk-fargate-run-task";
import { Construct } from "constructs";
import * as path from "path";

export class EcsRamblerMigrator extends Construct {
  constructor(
    scope: Construct,
    id: string,
    vpc: IVpc,
    rdsCluster: ServerlessCluster
  ) {
    super(scope, id);

    const ecsCluster = new ecs.Cluster(scope, "RamblerMigratorCluster", {
      vpc,
      clusterName: "rambler-migrator",
    });

    const asset = new DockerImageAsset(scope, "EcsDockerImage", {
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

    const task = new ecs.FargateTaskDefinition(scope, "RamblerMigratorTask", {
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
        logGroup: new LogGroup(scope, "RamblerMigrator", {
          logGroupName: `${id}-RamblerMigrator`,
          retention: RetentionDays.ONE_DAY,
        }),
      }),
    });

    const runTask = new RunTask(
      scope,
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
