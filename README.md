# SO Client for React Native

## Install
npm i @storedobject/so_client_rn

## Usage
```ts
import { SOConnection } from "@storedobject/so_client_rn";

SOConnection.init({ host: "...", application: "...", secured: true });

const st = await SOConnection.login("user", "pass");
if (!st) {
  const menu = await SOConnection.command("listMenu", {});
  console.log(menu);
}
