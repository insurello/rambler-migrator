import * as ec2 from "@aws-cdk/aws-ec2";
import { IVpc, Port, SubnetType } from "@aws-cdk/aws-ec2";
import { DockerImageAsset } from "@aws-cdk/aws-ecr-assets";
import * as ecs from "@aws-cdk/aws-ecs";
import { ScheduledFargateTask } from "@aws-cdk/aws-ecs-patterns";
import * as events from "@aws-cdk/aws-events";
import * as iam from "@aws-cdk/aws-iam";
import * as lambda from "@aws-cdk/aws-lambda";
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

    const task = new ScheduledFargateTask(this, "RamblerMigratorTask", {
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
      schedule: events.Schedule.cron({ year: "1947", month: "10", day: "14" }),
      platformVersion: ecs.FargatePlatformVersion.LATEST,
      subnetSelection: { subnetType: SubnetType.PRIVATE_WITH_NAT },
    });

    task.task.securityGroups?.forEach((sg) => {
      sg.connections.allowTo(
        dbCluster.connections,
        Port.tcp(dbCluster.clusterEndpoint.port)
      );
    });

    const fn = new lambda.Function(this, "func", {
      functionName: "ecs-rambler-migrator",
      code: lambda.Code.fromAsset(path.join(__dirname, "../src/ecs-migrator")),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "app.handler",
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
      memorySize: 256,
      timeout: cdk.Duration.minutes(5),
    });

    task.taskDefinition.taskRole.grantPassRole(fn.role!);
    fn.role?.attachInlinePolicy(
      new iam.Policy(this, "runTaskPolicy", {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["ecs:RunTask"],
            resources: [task.taskDefinition.taskDefinitionArn],
          }),
        ],
      })
    );

    const triggerParams = {
      service: "Lambda",
      action: "invoke",
      parameters: {
        FunctionName: fn.functionName,
        InvocationType: "Event",
        Payload: JSON.stringify({
          taskDefinitionArn: task.taskDefinition.taskDefinitionArn,
          clusterArn: ecsCluster.clusterArn,
        }),
      },
      physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()),
    };

    const ecsTrigger = new cr.AwsCustomResource(this, "EcsTrigger", {
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ["lambda:InvokeFunction"],
          effect: iam.Effect.ALLOW,
          resources: [fn.functionArn],
        }),
      ]),
      timeout: cdk.Duration.minutes(15),
      onCreate: triggerParams,
      onUpdate: triggerParams,
    });
  }
}
