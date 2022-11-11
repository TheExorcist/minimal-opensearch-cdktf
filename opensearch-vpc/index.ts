import { TerraformStack, TerraformOutput } from "cdktf"

import { Vpc } from "@cdktf/provider-aws/lib/vpc"
import { Subnet } from "@cdktf/provider-aws/lib/subnet"
import { InternetGateway } from "@cdktf/provider-aws/lib/internet-gateway"
import { NatGateway } from "@cdktf/provider-aws/lib/nat-gateway"
import { Eip } from "@cdktf/provider-aws/lib/eip"
import { RouteTable } from "@cdktf/provider-aws/lib/route-table"
import { Route } from "@cdktf/provider-aws/lib/route"
import { RouteTableAssociation } from "@cdktf/provider-aws/lib/route-table-association"
import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group"
import { SecurityGroupRule } from "@cdktf/provider-aws/lib/security-group-rule"

import { vpcAvailabilityZones } from '../config'

class OpensearchVpc {
  private readonly stack: TerraformStack
  private readonly availabilityZones: string[]
  private natGateways: NatGateway[]
  private publicSubnets: Subnet[]
  private privateSubnets: Subnet[]
  private publicRouteTable?: RouteTable
  private privateRouteTables: RouteTable[]
  private internetGateway?: InternetGateway

  constructor(stack: TerraformStack) {
    this.stack = stack
    this.natGateways = []
    this.publicSubnets = []
    this.privateSubnets = []
    this.privateRouteTables = []
    this.availabilityZones = vpcAvailabilityZones
  }

  getResourceTags() {
    return {
      Name: 'Open search',
      Team: 'Solution architects',
      Company: 'sidzen',
    }
  }

  getSubnetCidr(index = 1) {
    return `10.0.${index}.0/24`
  }

  // Create IPs also
  // Provision for future support of the public network.
  private createNatGateways() {
    this.publicSubnets.forEach((subnet, index) => {
      const eip = new Eip(this.stack, `opensearch-eip-${index}`, {
        vpc: true
      })
      const gateway = new NatGateway(this.stack, `opensearch-natgateway-${index}`, {
        allocationId: eip.id,
        subnetId: subnet.id,
      })
      this.natGateways.push(gateway)
    })
  }

  private associatePublicSubnetToPublicRouteTable() {
    this.publicSubnets.forEach((subnet, index) => {
      if (this.publicRouteTable) {
        new RouteTableAssociation(this.stack, `route-table-assoc-public-sub-${index}`, {
          routeTableId: this.publicRouteTable.id,
          subnetId: subnet.id,
        })
      }
    })
  }

  private createPrivateRouteTableAndAssociations(vpc: Vpc) {
    this.privateSubnets.forEach((subnet, index) => {
      const privateRouteTable = new RouteTable(this.stack, `private-route-table-${index}`, {
        vpcId: vpc.id
      })
      this.privateRouteTables.push(privateRouteTable)

      new Route(this.stack, `private-route-table-entry-${index}`, {
        destinationCidrBlock: "0.0.0.0/0",
        routeTableId: privateRouteTable.id,
        natGatewayId: this.natGateways[index].id,
      })

      new RouteTableAssociation(this.stack, `route-table-association-private-subnet-${index}`, {
        routeTableId: privateRouteTable.id,
        subnetId: subnet.id,
      })
    })
  }

  create() {

    const cidrBlock = `10.0.0.0/16`
    const vpc = new Vpc(this.stack, `opensearch-vpc`, {
      cidrBlock: cidrBlock,
      tags: this.getResourceTags()
    })

    // Create Internet Gateway For communication VPC and Internet
    this.internetGateway = new InternetGateway(this.stack, "Internet-Gateway", {
      vpcId: vpc.id,
      tags: this.getResourceTags()
    })

    this.publicRouteTable = new RouteTable(this.stack, "public-route-table-for-opensearch-vpc", {
      vpcId: vpc.id
    })

    new Route(this.stack, 'Route', {
      destinationCidrBlock: "0.0.0.0/0",
      routeTableId: this.publicRouteTable?.id,
      gatewayId: this.internetGateway.id,
    })

    this.availabilityZones.forEach((availabilityZoneName, index) => {
      const privateSubnet = new Subnet(this.stack, `private-subnet-${index + 1}`, {
        availabilityZone: availabilityZoneName,
        vpcId: vpc.id,
        mapPublicIpOnLaunch: false,
        cidrBlock: this.getSubnetCidr(index + 1),
        tags: this.getResourceTags()
      })
      this.privateSubnets.push(privateSubnet)
    })

    this.availabilityZones.forEach((availabilityZoneName, index) => {
      const publicSubnet: any = new Subnet(this.stack, `Public-subnet-${index + 1}`, {
        availabilityZone: availabilityZoneName,
        vpcId: vpc.id,
        mapPublicIpOnLaunch: true,
        cidrBlock: this.getSubnetCidr(this.privateSubnets.length + index + 1),
        tags: this.getResourceTags()
      })

      this.publicSubnets.push(publicSubnet)
    })

    this.createNatGateways()
    this.associatePublicSubnetToPublicRouteTable()
    this.createPrivateRouteTableAndAssociations(vpc)

    new TerraformOutput(this.stack, 'vpc-data', {
      value: {
        vpc: vpc,
        publicSubnets: this.publicSubnets,
        privateSubnets: this.privateSubnets
      }
    })

    const securityGroup = new SecurityGroup(this.stack, 'security-group', {
      name: 'custom-vpc-opensearch-rule',
      vpcId: vpc.id
    })

    new SecurityGroupRule(this.stack, 'security-group-rule-ingress', {
      securityGroupId: securityGroup.id,
      sourceSecurityGroupId: securityGroup.id,
      protocol: 'all',
      type: 'ingress',
      toPort: 0,
      fromPort: 0
    })

    new SecurityGroupRule(this.stack, 'security-group-rule-egress', {
      securityGroupId: securityGroup.id,
      protocol: 'all',
      type: 'egress',
      toPort: 0,
      fromPort: 0,
      cidrBlocks: ["0.0.0.0/0"]
    })

    return { 
      privateSubnets: this.privateSubnets,
      securityGroupId: securityGroup.id
    }
  }
}

export default OpensearchVpc
