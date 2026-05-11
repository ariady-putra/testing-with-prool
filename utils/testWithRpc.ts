import getPort from "get-port";
import { test } from "vitest";
import { getInstances } from "./getInstances";
import { optimismSepolia } from "viem/chains";

let ports: number[] = [];

export const testWithRpc = test.extend<{
  rpc: {
    anvilRpc: string;
    altoRpc: string;
    paymasterRpc: string;
  };
}>({
  rpc: async ({}, use) => {
    const altoPort = await getPort({
      exclude: ports,
    });
    ports.push(altoPort);
    const paymasterPort = await getPort({
      exclude: ports,
    });
    ports.push(paymasterPort);
    const anvilPort = await getPort({
      exclude: ports,
    });
    ports.push(anvilPort);

    const anvilRpc = `http://localhost:${anvilPort}`;
    const altoRpc = `http://localhost:${altoPort}`;
    const paymasterRpc = `http://localhost:${paymasterPort}`;

    const forkUrl = process.env.FORK_RPC_URL || optimismSepolia.rpcUrls.default.http[0];

    const instances = await getInstances({
      forkUrl,
      anvilPort,
      altoPort,
      paymasterPort,
    });

    await use({
      anvilRpc,
      altoRpc,
      paymasterRpc,
    });

    await Promise.all([...instances.map((instance) => instance.stop())]);
    const usedPorts = [altoPort, anvilPort, paymasterPort];
    ports = ports.filter((port) => !usedPorts.includes(port));
  },
});
