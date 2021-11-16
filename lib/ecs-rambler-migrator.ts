import { IVpc, Port, SubnetType } from "@aws-cdk/aws-ec2";
import { DockerImageAsset } from "@aws-cdk/aws-ecr-assets";
import * as ecs from "@aws-cdk/aws-ecs";
import { ScheduledFargateTask } from "@aws-cdk/aws-ecs-patterns";
import * as events from "@aws-cdk/aws-events";
import * as iam from "@aws-cdk/aws-iam";
import { ServerlessCluster } from "@aws-cdk/aws-rds";
import * as cdk from "@aws-cdk/core";
import * as cr from "@aws-cdk/custom-resources";
import * as path from "path";

export class EcsRamblerMigrator extends cdk.Stack {
  constructor(
    scope: cdk.Construct,
    id: string,
    vpc: IVpc,
    dbCluster: ServerlessCluster,
    props: cdk.StackProps
  ) {
    super(scope, id, props);

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

    const task = new ScheduledFargateTask(this, "FlightCollectorTask", {
      cluster: ecsCluster,
      scheduledFargateTaskImageOptions: {
        image: ecs.ContainerImage.fromDockerImageAsset(asset),
        memoryLimitMiB: 512,
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
      },
      schedule: events.Schedule.cron({ year: "1970" }), // Run cron at every minute 1. Effectively running once per hour. More info https://crontab.guru/#0_*_*_*_*
      platformVersion: ecs.FargatePlatformVersion.LATEST,
      subnetSelection: { subnetType: SubnetType.PUBLIC },
    });

    task.task.securityGroups?.forEach((sg) => {
      sg.connections.allowTo(
        dbCluster.connections,
        Port.tcp(dbCluster.clusterEndpoint.port)
      );
    });

    const triggerParams = {
      service: "ecs",
      action: "RunTask",
      parameters: {
        taskDefinition: task.taskDefinition.taskDefinitionArn,
        cluster: ecsCluster.clusterName,
        count: 1,
      },
      physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()),
    };

    const ecsTrigger = new cr.AwsCustomResource(this, "EcsTrigger", {
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ["ecs:RunTask"],
          effect: iam.Effect.ALLOW,
          resources: [task.taskDefinition.taskDefinitionArn],
        }),
      ]),
      timeout: cdk.Duration.minutes(15),
      onCreate: triggerParams,
      onUpdate: triggerParams,
    });
  }
}
