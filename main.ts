import { Construct } from "constructs";

import { App, TerraformStack, S3Backend, S3BackendProps } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";

import OpensearchVpc from './opensearch-vpc'
import ElasticSearchDomain from "./opensearch-domain";
import OpensearchDynamodbGlobalTable from './opensearch-dynamodb'
import { opensearchClusterConfig, opensearchDomainConfig, opensearchDomainEbsOptions, dynamodbTableConfig } from './config';
import CloudwatchAlarm from './cloudwatch-alarm'

class MyStack extends TerraformStack {

  public readonly awsProvider: AwsProvider

  constructor(scope: Construct, id: string) {
    super(scope, id);
    // Using the defaut profile
    this.awsProvider = new AwsProvider(this, "AWS", {
      region: "us-east-1",
      assumeRole: {
        duration: "60m",
        roleArn: "arn:aws:iam::214893407492:role/vpc-resticted-access",
        sessionName: "ProvisionOpensearch"
      }
    });

    new S3Backend(this, <S3BackendProps>{
      bucket: `oslash-assignment-tfstates`,
      key: `develop.tfstate`,
      roleArn: `arn:aws:iam::214893407492:role/TerraformRemoteStates`,
      region: `us-east-1`,
      sessionName: `oslash-provisioning`
    })
  }
}

const app = new App();
const stack = new MyStack(app, 'opensearch');
const vpc = new OpensearchVpc(stack)
const vpcData = vpc.create()

new ElasticSearchDomain(
  stack,
  vpcData.privateSubnets.map(subnet => subnet.id),
  vpcData.securityGroupId,
  opensearchClusterConfig(vpcData.privateSubnets.length),
  opensearchDomainConfig,
  opensearchDomainEbsOptions
).create()

new OpensearchDynamodbGlobalTable(stack).create(dynamodbTableConfig)
CloudwatchAlarm(stack)

app.synth();
