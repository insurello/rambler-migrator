import { APIGatewayProxyEvent } from "aws-lambda";
import { exec } from "child_process";
import * as AWS from "aws-sdk";
import * as util from "util";

// Create a Secrets Manager client
const secrets = () => new AWS.SecretsManager();

const execP = util.promisify(exec);

const secretString = (secretId: string, secretValue: string): Promise<string> =>
  Promise.resolve(
    secrets()
      .getSecretValue({ SecretId: secretId })
      .promise()
      .then((data) => {
        if (data.SecretString) {
          const value = JSON.parse(data.SecretString)[secretValue];
          return value;
        } else {
          throw new Error("invalid secret string");
        }
      })
  );

export const handler = async (_event: APIGatewayProxyEvent) => {
  const password = await secretString(process.env!.SECRET_ARN!, "password");
  const command = `RAMBLER_PASSWORD=${password} ./rambler apply --all`;

  const { stdout, stderr } = await execP(command);
  console.log(stdout);

  if (stderr !== null && stderr !== "") {
    console.error(stderr);
    return {
      statusCode: 500,
      body: "",
    };
  } else {
    return {
      statusCode: 200,
      body: "",
    };
  }
};
