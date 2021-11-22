import * as ec2 from "@aws-cdk/aws-ec2";
import * as iam from "@aws-cdk/aws-iam";
import * as lambda from "@aws-cdk/aws-lambda";
import * as rds from "@aws-cdk/aws-rds";
import * as cdk from "@aws-cdk/core";
import * as cr from "@aws-cdk/custom-resources";
import * as path from "path";

export class LambdaRamblerMigrator extends cdk.Stack {
  constructor(
    scope: cdk.Construct,
    id: string,
    vpc: ec2.Vpc,
    rdsCluster: rds.ServerlessCluster,
    props?: cdk.StackProps
  ) {
    super(scope, id, props);

    const dbUser = rdsCluster.secret!.secretValueFromJson("username");

    const fn = new lambda.DockerImageFunction(this, "func", {
      functionName: "rambler-migrator",
      code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, "../"), {
        file: "Dockerfile.lambda2",
      }),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
      memorySize: 256,
      timeout: cdk.Duration.minutes(5),
      environment: {
        RAMBLER_HOST: rdsCluster.clusterEndpoint.hostname,
        RAMBLER_USER: dbUser.toString(),
        SECRET_ARN: rdsCluster.secret!.secretArn,
      },
    });

    fn.connections.allowTo(
      rdsCluster,
      ec2.Port.tcp(rdsCluster.clusterEndpoint.port)
    );

    rdsCluster.secret!.grantRead(fn.role!);

    // ref: https://github.com/aws/aws-cdk/issues/10820
    const lambdaTrigger = new cr.AwsCustomResource(this, "FunctionTrigger", {
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ["lambda:InvokeFunction"],
          effect: iam.Effect.ALLOW,
          resources: [fn.functionArn],
        }),
      ]),
      timeout: cdk.Duration.minutes(15),
      onCreate: {
        service: "Lambda",
        action: "invoke",
        parameters: {
          FunctionName: fn.functionName,
          InvocationType: "Event",
        },
        physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()),
      },
      onUpdate: {
        service: "Lambda",
        action: "invoke",
        parameters: {
          FunctionName: fn.functionName,
          InvocationType: "Event",
        },
        physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()),
      },
    });
  }
}
