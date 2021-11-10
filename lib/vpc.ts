import * as ec2 from "@aws-cdk/aws-ec2";
import * as cdk from "@aws-cdk/core";

export class VpcStack extends cdk.Stack {
  vpc: ec2.Vpc;
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, "my-cdk-vpc", {
      cidr: "10.0.0.0/16",
      natGateways: 1,
      maxAzs: 3,
      subnetConfiguration: [
        {
          name: "private-subnet-1",
          subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
          cidrMask: 24,
        },
        {
          name: "public-subnet-1",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });
  }
}
