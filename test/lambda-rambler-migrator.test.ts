import {
  expect as expectCDK,
  matchTemplate,
  MatchStyle,
} from "@aws-cdk/assert";
import * as cdk from "@aws-cdk/core";
import * as LambdaRamblerMigrator from "../lib/lambda-rambler-migrator";

test("Empty Stack", () => {
  const app = new cdk.App();
  // WHEN
  const stack = new LambdaRamblerMigrator.LambdaRamblerMigrator(
    app,
    "MyTestStack"
  );
  // THEN
  expectCDK(stack).to(
    matchTemplate(
      {
        Resources: {},
      },
      MatchStyle.EXACT
    )
  );
});
