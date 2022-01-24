import { IVpc, Port } from "aws-cdk-lib/aws-ec2";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import {
  AwsLogDriver,
  Cluster,
  ContainerImage,
  FargateTaskDefinition,
  Secret,
} from "aws-cdk-lib/aws-ecs";
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

    const ecsCluster = new Cluster(this, "RamblerMigratorCluster", {
      vpc,
      clusterName: "rambler-migrator",
    });

    const asset = new DockerImageAsset(this, "EcsDockerImage", {
      directory: path.join(__dirname, "../"),
      file: "Dockerfile.ecs",
    });

    const dbHost = rdsCluster.clusterEndpoint.hostname;
    const dbUser = Secret.fromSecretsManager(rdsCluster.secret!, "username");
    const dbPassword = Secret.fromSecretsManager(
      rdsCluster.secret!,
      "password"
    );

    const task = new FargateTaskDefinition(this, "RamblerMigratorTask", {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    task.addContainer("RamblerDocker", {
      image: ContainerImage.fromDockerImageAsset(asset),
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
      logging: new AwsLogDriver({
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
