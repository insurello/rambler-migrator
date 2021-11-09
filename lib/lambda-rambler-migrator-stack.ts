import * as iam from "@aws-cdk/aws-iam";
import * as lambda from "@aws-cdk/aws-lambda";
import * as cdk from "@aws-cdk/core";
import * as cr from "@aws-cdk/custom-resources";
import * as path from "path";

export class LambdaRamblerMigratorStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const fn = new lambda.DockerImageFunction(this, "func", {
      code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, "../")),
    });

    // ref: https://github.com/aws/aws-cdk/issues/10820
    const lambdaTrigger = new cr.AwsCustomResource(this, "FunctionTrigger", {
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ["lambda:InvokeFunction"],
          effect: iam.Effect.ALLOW,
          resources: [fn.functionArn],
        }),
      ]),
      // timeout: cdk.Duration.minutes(15),
      onCreate: {
        service: "Lambda",
        action: "invoke",
        parameters: {
          FunctionName: fn.functionName,
          InvocationType: "Event",
        },
        physicalResourceId: cr.PhysicalResourceId.of(
          "JobSenderTriggerPhysicalId"
        ),
      },
      onUpdate: {
        service: "Lambda",
        action: "invoke",
        parameters: {
          FunctionName: fn.functionName,
          InvocationType: "Event",
        },
        physicalResourceId: cr.PhysicalResourceId.of(
          "JobSenderTriggerPhysicalId"
        ),
      },
    });
  }
}
