import { CloudwatchMetricAlarm } from "@cdktf/provider-aws/lib/cloudwatch-metric-alarm";
import { TerraformStack } from 'cdktf'

import { LowSpaceAlarmConfig } from './config'

//@TODO: SNS has to be added.

export default function CloudwatchAlarm(stack: TerraformStack) {
  new CloudwatchMetricAlarm(
    stack,
    'Low-Space-cloud-watch-opensearch', {
      alarmName: `${LowSpaceAlarmConfig.prefix}ElasticSearch-FreeStorageSpaceTooLow-prod`,
      comparisonOperator: "LessThanOrEqualToThreshold",
      evaluationPeriods: LowSpaceAlarmConfig.alarmFreeStorageLowPeriod,
      datapointsToAlarm: LowSpaceAlarmConfig.alarmFreeStorageLowPeriod,
      metricName: LowSpaceAlarmConfig.metricName,
      namespace: LowSpaceAlarmConfig.namespace,
      statistic: LowSpaceAlarmConfig.statistics,
      threshold: LowSpaceAlarmConfig.threshold,
      alarmDescription: LowSpaceAlarmConfig.alarmDescription,
      treatMissingData: LowSpaceAlarmConfig.treatMissingData,
      dimensions: {
        DomainName: LowSpaceAlarmConfig.domainName
      }
    }
  )
}
