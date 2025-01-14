import 'aws-sdk-client-mock-jest';
import { AuthorizeSecurityGroupEgressCommand, AuthorizeSecurityGroupIngressCommand, EC2, RevokeSecurityGroupEgressCommand, RevokeSecurityGroupIngressCommand } from '@aws-sdk/client-ec2';
import { mockClient } from 'aws-sdk-client-mock';
import { handler } from '../lib/restrict-default-security-group-handler';

const mockEc2Client = mockClient(EC2);

beforeEach(() => {
  mockEc2Client.reset();
});

test('revokes rules on create event', async () => {
  // GIVEN
  const event: Partial<AWSLambda.CloudFormationCustomResourceCreateEvent> = {
    RequestType: 'Create',
    ResourceProperties: {
      ServiceToken: 'Foo',
      DefaultSecurityGroupId: 'sg-abc123',
      Account: '12345678912',
    },
  };

  // WHEN
  await invokeHandler(event);

  // THEN
  expect(mockEc2Client).toHaveReceivedCommandTimes(RevokeSecurityGroupEgressCommand, 1);
  expect(mockEc2Client).toHaveReceivedCommandTimes(RevokeSecurityGroupIngressCommand, 1);
  expect(mockEc2Client).toHaveReceivedCommandWith(RevokeSecurityGroupEgressCommand, {
    GroupId: 'sg-abc123',
    IpPermissions: [{
      IpRanges: [{
        CidrIp: '0.0.0.0/0',
      }],
      IpProtocol: '-1',
    }],
  });
  expect(mockEc2Client).toHaveReceivedCommandWith(RevokeSecurityGroupIngressCommand, {
    GroupId: 'sg-abc123',
    IpPermissions: [{
      UserIdGroupPairs: [{
        UserId: '12345678912',
        GroupId: 'sg-abc123',
      }],
      IpProtocol: '-1',
    }],
  });
});

test('authorizes rules on delete event', async () => {
  // GIVEN
  const event: Partial<AWSLambda.CloudFormationCustomResourceDeleteEvent> = {
    RequestType: 'Delete',
    ResourceProperties: {
      ServiceToken: 'Foo',
      DefaultSecurityGroupId: 'sg-abc123',
      Account: '12345678912',
    },
  };

  // WHEN
  await invokeHandler(event);

  // THEN
  expect(mockEc2Client).toHaveReceivedCommandTimes(RevokeSecurityGroupEgressCommand, 0);
  expect(mockEc2Client).toHaveReceivedCommandTimes(RevokeSecurityGroupIngressCommand, 0);
  expect(mockEc2Client).toHaveReceivedCommandTimes(AuthorizeSecurityGroupEgressCommand, 1);
  expect(mockEc2Client).toHaveReceivedCommandTimes(AuthorizeSecurityGroupIngressCommand, 1);
  expect(mockEc2Client).toHaveReceivedCommandWith(AuthorizeSecurityGroupIngressCommand, {
    GroupId: 'sg-abc123',
    IpPermissions: [{
      UserIdGroupPairs: [{
        UserId: '12345678912',
        GroupId: 'sg-abc123',
      }],
      IpProtocol: '-1',
    }],
  });
  expect(mockEc2Client).toHaveReceivedCommandWith(AuthorizeSecurityGroupEgressCommand, {
    GroupId: 'sg-abc123',
    IpPermissions: [{
      IpRanges: [{
        CidrIp: '0.0.0.0/0',
      }],
      IpProtocol: '-1',
    }],
  });
});

test('update event with no change', async () => {
  // GIVEN
  const event: Partial<AWSLambda.CloudFormationCustomResourceUpdateEvent> = {
    RequestType: 'Update',
    ResourceProperties: {
      ServiceToken: 'Foo',
      DefaultSecurityGroupId: 'sg-abc123',
      Account: '12345678912',
    },
    OldResourceProperties: {
      ServiceToken: 'Foo',
      DefaultSecurityGroupId: 'sg-abc123',
      Account: '12345678912',
    },
  };

  // WHEN
  await invokeHandler(event);

  // THEN
  expect(mockEc2Client).toHaveReceivedCommandTimes(RevokeSecurityGroupEgressCommand, 0);
  expect(mockEc2Client).toHaveReceivedCommandTimes(RevokeSecurityGroupIngressCommand, 0);
  expect(mockEc2Client).toHaveReceivedCommandTimes(AuthorizeSecurityGroupEgressCommand, 0);
  expect(mockEc2Client).toHaveReceivedCommandTimes(AuthorizeSecurityGroupIngressCommand, 0);
});

test('update event with security group change', async () => {
  // GIVEN
  const event: Partial<AWSLambda.CloudFormationCustomResourceUpdateEvent> = {
    RequestType: 'Update',
    ResourceProperties: {
      ServiceToken: 'Foo',
      DefaultSecurityGroupId: 'sg-abc123',
      Account: '12345678912',
    },
    OldResourceProperties: {
      ServiceToken: 'Foo',
      DefaultSecurityGroupId: 'sg-xyz123',
      Account: '12345678912',
    },
  };

  // WHEN
  await invokeHandler(event);

  // THEN
  expect(mockEc2Client).toHaveReceivedCommandTimes(RevokeSecurityGroupEgressCommand, 1);
  expect(mockEc2Client).toHaveReceivedCommandTimes(RevokeSecurityGroupIngressCommand, 1);
  expect(mockEc2Client).toHaveReceivedCommandTimes(AuthorizeSecurityGroupEgressCommand, 1);
  expect(mockEc2Client).toHaveReceivedCommandTimes(AuthorizeSecurityGroupIngressCommand, 1);
  expect(mockEc2Client).toHaveReceivedCommandWith(RevokeSecurityGroupIngressCommand, {
    GroupId: 'sg-abc123',
    IpPermissions: [{
      UserIdGroupPairs: [{
        UserId: '12345678912',
        GroupId: 'sg-abc123',
      }],
      IpProtocol: '-1',
    }],
  });
  expect(mockEc2Client).toHaveReceivedCommandWith(RevokeSecurityGroupEgressCommand, {
    GroupId: 'sg-abc123',
    IpPermissions: [{
      IpRanges: [{
        CidrIp: '0.0.0.0/0',
      }],
      IpProtocol: '-1',
    }],
  });
  expect(mockEc2Client).toHaveReceivedCommandWith(AuthorizeSecurityGroupEgressCommand, {
    GroupId: 'sg-xyz123',
    IpPermissions: [{
      IpRanges: [{
        CidrIp: '0.0.0.0/0',
      }],
      IpProtocol: '-1',
    }],
  });
  expect(mockEc2Client).toHaveReceivedCommandWith(AuthorizeSecurityGroupIngressCommand, {
    GroupId: 'sg-xyz123',
    IpPermissions: [{
      UserIdGroupPairs: [{
        UserId: '12345678912',
        GroupId: 'sg-xyz123',
      }],
      IpProtocol: '-1',
    }],
  });
});

// helper function to get around TypeScript expecting a complete event object,
// even though our tests only need some of the fields
async function invokeHandler(event: Partial<AWSLambda.CloudFormationCustomResourceEvent>) {
  return handler(event as AWSLambda.CloudFormationCustomResourceEvent);
}
