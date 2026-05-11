import { paymaster } from "@pimlico/mock-paymaster";
import { anvil, alto } from "prool/instances";
import { Hex } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { foundry } from "viem/chains";

// Private keys of Anvil accounts
export const pk: Hex[] = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
  "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
  "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
  "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
  "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
  "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6",
];

export const getInstances = async ({
  forkUrl,
  anvilPort,
  altoPort,
  paymasterPort,
}: {
  forkUrl: string;
  anvilPort: number;
  altoPort: number;
  paymasterPort: number;
}) => {
  const anvilRpc = `http://localhost:${anvilPort}`;
  const altoRpc = `http://localhost:${altoPort}`;

  const anvilInstance = anvil({
    port: anvilPort,
    chainId: foundry.id,
    // hardfork: "Prague",
    forkUrl,
    optimism: forkUrl.includes("optimism"),
  });

  const altoInstance = alto({
    port: altoPort,
    entrypoints: [entryPoint07Address],
    rpcUrl: anvilRpc,
    executorPrivateKeys: [pk[0]],
    utilityPrivateKey: pk[1],
    safeMode: false,
    chainType: anvilInstance._internal.args.optimism ? "op-stack" : "default",
  });

  const paymasterInstance = paymaster({
    anvilRpc,
    altoRpc,
    port: paymasterPort,
  });

  //#region Uncomment these to print logs to stdout.

  anvilInstance.on("stderr", (data) => {
    console.error(data.toString());
  });
  anvilInstance.on("stdout", (data) => {
    console.log(data.toString());
  });

  altoInstance.on("stderr", (data) => {
    console.error(data.toString());
  });
  altoInstance.on("stdout", (data) => {
    console.log(data.toString());
  });

  paymasterInstance.on("stderr", (data) => {
    console.error(data.toString());
  });
  paymasterInstance.on("stdout", (data) => {
    console.log(data.toString());
  });

  //#endregion

  await anvilInstance.start();
  await altoInstance.start();
  await paymasterInstance.start();

  return [anvilInstance, altoInstance, paymasterInstance];
};
