import { DynamodbTable, DynamodbTableConfig } from "@cdktf/provider-aws/lib/dynamodb-table";
import { LambdaFunction } from "@cdktf/provider-aws/lib/lambda-function";
import { IamRole  } from "@cdktf/provider-aws/lib/iam-role";
import { DataAwsIamPolicy } from "@cdktf/provider-aws/lib/data-aws-iam-policy";

import { TerraformStack } from "cdktf";


class OpensearchDynamodbGlobalTable {

  private globalTable?: DynamodbTable
  private eventHandler?: LambdaFunction
  private stack: TerraformStack
  private eventHandlerExecutionRole?: IamRole

  constructor(stack: TerraformStack) {
    this.stack = stack
  }

  lambdaExecutionRole() {
    const ddbPolicy = new DataAwsIamPolicy(
      this.stack,
      `AWSLambdaDynaoDBExecutionRolePolicy`,
      { 
        name: 'AmazonDynamoDBFullAccess'
      }
    )

    const opensearchPolicy = new DataAwsIamPolicy(
      this.stack,
      `AmazonOpenSearchFullAccess`,
      {
        name: 'AmazonOpenSearchServiceFullAccess'
      }
    )

    this.eventHandlerExecutionRole = new IamRole(
      this.stack,
      `event-handler-ddb-executioner-role`, {
        name: 'event-handler-ddb-executioner-role',
        assumeRolePolicy: `{
          "Version": "2012-10-17",
          "Statement": [ {
            "Action": "sts:AssumeRole",
            "Principle": {
              "Service": "lambda.amazonaws.com"
            },
            "Effect": "Allow",
            "Sid": ""
          }
        ]
        }`,
        managedPolicyArns: [
          ddbPolicy.arn,
          opensearchPolicy.arn
        ]
      }
    )

    return this.eventHandlerExecutionRole
  }

  _createEventHandler() {
    if (!this.globalTable || !this.eventHandlerExecutionRole) return

    this.eventHandler = new LambdaFunction(
      this.stack, `ddb-event-handler`, {
        functionName: `${this.globalTable.name}-event-handler`,
        role: this.eventHandlerExecutionRole.id,
        filename: '../lambda_function.py',
        handler: 'lambda_function.lambda_handler',
        runtime: 'python3.8',
        dependsOn: [
          this.globalTable,
          this.eventHandlerExecutionRole
        ]
      }
    )
    return this.eventHandler
  }

  create(dynamodbConfig: DynamodbTableConfig) {
    this.globalTable = new DynamodbTable(this.stack, 
        `dynamodb-global-table`, {
           name: dynamodbConfig.name,
           billingMode: dynamodbConfig.billingMode,
           hashKey: dynamodbConfig.hashKey,
           rangeKey: dynamodbConfig.rangeKey,
           streamEnabled: dynamodbConfig.streamEnabled,
           streamViewType: dynamodbConfig.streamViewType,
           attribute: dynamodbConfig.attribute,
           replica: dynamodbConfig.replica,
           tableClass: dynamodbConfig.tableClass
        }
      )
    this.lambdaExecutionRole()
    this._createEventHandler()
    // creating DDB filters, lambda to be executed.
  }
}

export default OpensearchDynamodbGlobalTable
