import * as cdk from "@aws-cdk/core";
import * as rds from "@aws-cdk/aws-rds";
import * as ec2 from "@aws-cdk/aws-ec2";
declare const vpc: ec2.Vpc;

export class RdsStack extends cdk.Stack {
  cluster: rds.ServerlessCluster;

  constructor(scope: cdk.Construct, id: string, vpc: ec2.IVpc, props: any) {
    super(scope, id, { ...props, stackName: `${props.environmentName}-${id}` });

    this.cluster = new rds.ServerlessCluster(this, "ExampleCluster", {
      engine: rds.DatabaseClusterEngine.AURORA_POSTGRESQL,
      parameterGroup: rds.ParameterGroup.fromParameterGroupName(
        this,
        "ParameterGroup",
        "default.aurora-postgresql10"
      ),
      vpc,
      enableDataApi: true,
    });
  }
}
