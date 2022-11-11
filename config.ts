import { OpensearchDomainConfig, OpensearchDomainEbsOptions } from "@cdktf/provider-aws/lib/opensearch-domain"
import { DynamodbTableConfig } from "@cdktf/provider-aws/lib/dynamodb-table"

export const opensearchClusterConfig = (availabilityZoneCount: number): any => ({
  dedicatedMasterCount: availabilityZoneCount > 0 ? availabilityZoneCount : 1,
  dedicatedMasterEnabled: true,
  dedicatedMasterType: 't3.small.search',
  instanceCount: availabilityZoneCount > 0 ? availabilityZoneCount : 1,
  instanceType: 't3.small.search'
})

export const opensearchDomainConfig: OpensearchDomainConfig = {
  domainName: 'production-opensearch'
}

export const opensearchDomainEbsOptions: OpensearchDomainEbsOptions = {
  ebsEnabled: true,
  volumeSize: 10
}

// Below is the dynamoDB globaltable config

export const dynamodbTableConfig: DynamodbTableConfig = {
  name: 'opensearch-global-tables',
  billingMode: 'PAY_PER_REQUEST',
  hashKey: 'userId',
  rangeKey: 'score',
  streamEnabled: true,
  streamViewType: 'NEW_AND_OLD_IMAGES',
  attribute: [
    {
      name: 'userId',
      type: 'N'
    },
    {
      name: 'score',
      type: 'N'
    }
  ],
  replica: [
    { regionName: 'us-east-1' },
    { regionName: 'us-west-1' },
  ],
  tableClass: 'STANDARD'
}

export const vpcAvailabilityZones = [
  "us-east-1a",
  "us-east-1b",
  "us-east-1f"
]

export const LowSpaceAlarmConfig = {
  prefix: "production-opensearch",
  alarmFreeStorageLowPeriod: 10,
  metricName: "FreeStorageSpace",
  namespace: "AWS/ES",
  period: 10,
  statistics: 'Minimum',
  threshold: 0.30 * (opensearchDomainEbsOptions.volumeSize || 10), // 30 percent of ebs config
  alarmDescription: "Minimum free disk space is too low",
  treatMissingData: "ignore",
  domainName: opensearchDomainConfig.domainName
}
