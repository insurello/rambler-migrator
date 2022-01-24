import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import { Construct } from "constructs";
declare const vpc: ec2.Vpc;

export class RdsStack extends cdk.Stack {
  cluster: rds.ServerlessCluster;

  constructor(scope: Construct, id: string, vpc: ec2.IVpc, props: any) {
    super(scope, id, props);

    this.cluster = new rds.ServerlessCluster(this, "ExampleCluster", {
      engine: rds.DatabaseClusterEngine.AURORA_POSTGRESQL,
      parameterGroup: rds.ParameterGroup.fromParameterGroupName(
        this,
        "ParameterGroup",
        "default.aurora-postgresql10"
      ),
      vpc,
      enableDataApi: true,
      defaultDatabaseName: "example",
    });
  }
}
