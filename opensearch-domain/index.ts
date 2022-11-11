
import { TerraformStack } from "cdktf";
import { OpensearchDomain } from "@cdktf/provider-aws/lib/opensearch-domain";


interface ClusterConfig {
  dedicatedMasterCount: number
  dedicatedMasterEnabled: boolean
  dedicatedMasterType: string
  instanceCount: number
  instanceType: string
}

interface DomainConfig {
  domainName: string
}

class ElasticSearchDomain {
  // Should be set by the ENV or data variables
  static readonly clusterVersion = 1.3

  private readonly stack: TerraformStack
  private opensearchCluster?: OpensearchDomain
  private clusterConfig: ClusterConfig
  private domainConfig: DomainConfig
  private privateSubnetIds: string[]
  private securityGroupId: string
  private ebsConfig: any

  constructor(stack: TerraformStack, privateSubnetIds: string[], securityGroupId: string, clusterConfig: ClusterConfig, domainConfig: DomainConfig, ebsConfig: any) {
    this.stack = stack
    this.clusterConfig = clusterConfig
    this.domainConfig = domainConfig
    this.privateSubnetIds = privateSubnetIds
    this.securityGroupId = securityGroupId
    this.ebsConfig = ebsConfig
  }

  public create() {
    this.opensearchCluster = new OpensearchDomain(
      this.stack,
      `opensearch-domain-${ElasticSearchDomain.clusterVersion}`,
      {
        domainName: this.domainConfig.domainName,
        clusterConfig: {
          dedicatedMasterType: this.clusterConfig.dedicatedMasterType,
          dedicatedMasterCount: this.clusterConfig.dedicatedMasterCount,
          dedicatedMasterEnabled: this.clusterConfig.dedicatedMasterEnabled,
          instanceCount: this.clusterConfig.instanceCount,
          instanceType: this.clusterConfig.instanceType,
          zoneAwarenessEnabled: true,
          zoneAwarenessConfig: {
            availabilityZoneCount: this.clusterConfig.instanceCount
          }
        },
        ebsOptions: {
          ebsEnabled: true,
          volumeSize: this.ebsConfig.volumeSize
        },
        vpcOptions: {
          subnetIds: this.privateSubnetIds,
          securityGroupIds: [
            this.securityGroupId
          ]
        }
      }
    )
    return this.opensearchCluster
  }
}

export default ElasticSearchDomain
