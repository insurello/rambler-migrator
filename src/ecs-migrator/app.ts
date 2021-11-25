import { APIGatewayProxyEvent } from "aws-lambda";
import * as AWS from "aws-sdk";

const ecs = () => new AWS.ECS();

const runTask = (taskDefinitionArn: string, clusterArn: string) =>
  Promise.resolve(
    ecs()
      .runTask({
        taskDefinition: taskDefinitionArn,
        count: 1,
        cluster: clusterArn,
      })
      .promise()
      .then((data) => data.tasks!.map((instance) => instance.taskArn!))
  );

export const handler = async (event: {
  taskDefinitionArn: string;
  clusterArn: string;
}) => {
  await runTask(event.taskDefinitionArn, event.clusterArn)
    .catch((err) => {
      console.error(err);
      return {
        statusCode: 500,
        body: "",
      };
    })
    .then((taskArns) => {
      console.log(taskArns);
      return {
        statusCode: 200,
        body: "",
      };
    });
};
