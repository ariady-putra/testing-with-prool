import { expect, describe } from "vitest";

import { createPublicClient, encodePacked, Hex, http, keccak256, walletActions } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { SmartAccount } from "viem/account-abstraction";
import { foundry } from "viem/chains";

import { createSmartAccountClient } from "permissionless";
import { getMEEVersion, MEEVersion, toNexusAccount } from "@biconomy/abstractjs";
import { toNexusSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { erc7579Actions, InstallModuleParameters } from "permissionless/actions/erc7579";

import { pk } from "../utils/getInstances";
import { testWithRpc } from "../utils/testWithRpc";
import { Action, encodeBatch, encodeExecuteBatch, encodeExecuteSingle, encodeMode, encodeSingle } from "../utils/erc7579";
import { CALLTYPE } from "../erc7579/calltype";
import { EXECTYPE } from "../erc7579/exectype";
import CounterExecutorModuleJSON from "../CounterExecutorModule.json";

describe("ERC-7579 test cases", () => {
  testWithRpc("Can execute single", async ({ rpc }) => {
    const { anvilRpc, altoRpc, paymasterRpc } = rpc;

    // Setup clients.
    const publicClient = createPublicClient({
      chain: foundry,
      transport: http(anvilRpc),
    }).extend(walletActions);

    const pimlicoClient = createPimlicoClient({
      chain: foundry,
      transport: http(paymasterRpc),
    });

    const privateKey = generatePrivateKey();
    const owner = privateKeyToAccount(privateKey);

    const counterExecutorModule: InstallModuleParameters<SmartAccount> = {
      type: "executor",
      address: "0x402A5947e74A234728fce825740D375Da4C80064",
      context: owner.address as Hex,
    };

    // const account = await toNexusSmartAccount({
    //   client: publicClient,
    //   owners: [owner],
    //   version: "1.0.0",
    // });
    const account = await toNexusAccount({
      signer: owner,
      chainConfiguration: {
        chain: foundry,
        transport: http(anvilRpc),
        version: getMEEVersion(MEEVersion.V3_0_0),
      },
      executors: [{
        module: counterExecutorModule.address,
        data: counterExecutorModule.context,
      }],
    });

    const smartAccountClient = createSmartAccountClient({
      account,
      chain: foundry,
      bundlerTransport: http(altoRpc),
      paymaster: pimlicoClient,
      userOperation: {
        estimateFeesPerGas: async () =>
          (await pimlicoClient.getUserOperationGasPrice()).fast
      },
    }).extend(
      erc7579Actions()
    );

    const CounterExecutor = {
      ...CounterExecutorModuleJSON,
      module: counterExecutorModule,
    };

    const incrementCount: Action = {
      target: CounterExecutor.module.address,
      value: 0n,
      data: {
        abi: CounterExecutor.abi,
        functionName: "incrementCount",
      },
    };

    const incrementCountTxHash = await smartAccountClient.sendTransaction({
      callData: encodeExecuteSingle(incrementCount),
    });

    const { status: incrementCountStatus } = await publicClient.waitForTransactionReceipt({
      hash: incrementCountTxHash,
    });
    expect(incrementCountStatus).toStrictEqual("success");

    //#region Execute from executor.
    const admin = privateKeyToAccount(pk[pk.length - 1]);

    const executeIncrementCountFromExecutorArgs = {
      account: account.address,
      salt: await publicClient.readContract({
        address: CounterExecutor.module.address,
        abi: CounterExecutor.abi,
        functionName: "getSalt",
        args: [owner.address],
      }) as Hex,
      mode: encodeMode(CALLTYPE.SINGLE, EXECTYPE.DEFAULT),
      module: CounterExecutor.module.address,
      action: encodeSingle(incrementCount),
      signature: "0x" as Hex,
    };

    const executeIncrementCountFromExecutorMessage = encodePacked(
      ["address", "bytes32", "bytes32", "address", "bytes"],
      [
        executeIncrementCountFromExecutorArgs.account,
        executeIncrementCountFromExecutorArgs.salt,
        executeIncrementCountFromExecutorArgs.mode,
        executeIncrementCountFromExecutorArgs.module,
        executeIncrementCountFromExecutorArgs.action,
      ],
    );

    executeIncrementCountFromExecutorArgs.signature = await owner.signMessage({
      message: {
        raw: keccak256(executeIncrementCountFromExecutorMessage),
      },
    });

    const { request: executeIncrementCountFromExecutor } = await publicClient.simulateContract({
      address: CounterExecutor.module.address,
      abi: CounterExecutor.abi,
      functionName: "execute",
      args: [
        executeIncrementCountFromExecutorArgs.account,
        executeIncrementCountFromExecutorArgs.salt,
        executeIncrementCountFromExecutorArgs.mode,
        encodePacked(
          ["bytes", "bytes"],
          [
            executeIncrementCountFromExecutorArgs.signature,
            executeIncrementCountFromExecutorArgs.action,
          ],
        ),
      ],
      account: admin,
      nonce: await publicClient.getTransactionCount({
        address: admin.address,
        blockTag: "pending",
      }),
    });
    const executeIncrementCountFromExecutorTxHash = await publicClient.writeContract(executeIncrementCountFromExecutor);

    const { status: executeIncrementCountFromExecutorStatus } = await publicClient.waitForTransactionReceipt({
      hash: executeIncrementCountFromExecutorTxHash,
    });
    expect(executeIncrementCountFromExecutorStatus).toStrictEqual("success");
    //#endregion
  });

  testWithRpc("Can execute batch", async ({ rpc }) => {
    const { anvilRpc, altoRpc, paymasterRpc } = rpc;

    // Setup clients.
    const publicClient = createPublicClient({
      chain: foundry,
      transport: http(anvilRpc),
    }).extend(walletActions);

    const pimlicoClient = createPimlicoClient({
      chain: foundry,
      transport: http(paymasterRpc),
    });

    const privateKey = generatePrivateKey();
    const owner = privateKeyToAccount(privateKey);

    const counterExecutorModule: InstallModuleParameters<SmartAccount> = {
      type: "executor",
      address: "0x402A5947e74A234728fce825740D375Da4C80064",
      context: owner.address as Hex,
    };

    // const account = await toNexusSmartAccount({
    //   client: publicClient,
    //   owners: [owner],
    //   version: "1.0.0",
    // });
    const account = await toNexusAccount({
      signer: owner,
      chainConfiguration: {
        chain: foundry,
        transport: http(anvilRpc),
        version: getMEEVersion(MEEVersion.V3_0_0),
      },
      executors: [{
        module: counterExecutorModule.address,
        data: counterExecutorModule.context,
      }],
    });

    const smartAccountClient = createSmartAccountClient({
      account,
      chain: foundry,
      bundlerTransport: http(altoRpc),
      paymaster: pimlicoClient,
      userOperation: {
        estimateFeesPerGas: async () =>
          (await pimlicoClient.getUserOperationGasPrice()).fast
      },
    }).extend(
      erc7579Actions()
    );

    const CounterExecutor = {
      ...CounterExecutorModuleJSON,
      module: counterExecutorModule,
    };

    const incrementCount: Action = {
      target: CounterExecutor.module.address,
      value: 0n,
      data: {
        abi: CounterExecutor.abi,
        functionName: "incrementCount",
      },
    };

    const batchIncrementCountTxHash = await smartAccountClient.sendTransaction({
      callData: encodeExecuteBatch([incrementCount, incrementCount, incrementCount]),
    });

    const { status: batchIncrementCountStatus } = await publicClient.waitForTransactionReceipt({
      hash: batchIncrementCountTxHash,
    });
    expect(batchIncrementCountStatus).toStrictEqual("success");

    //#region Execute from executor.
    const admin = privateKeyToAccount(pk[pk.length - 1]);

    const batchExecuteIncrementCountFromExecutorArgs = {
      account: account.address,
      salt: await publicClient.readContract({
        address: CounterExecutor.module.address,
        abi: CounterExecutor.abi,
        functionName: "getSalt",
        args: [owner.address],
      }) as Hex,
      mode: encodeMode(CALLTYPE.BATCH, EXECTYPE.DEFAULT),
      module: CounterExecutor.module.address,
      action: encodeBatch([incrementCount, incrementCount, incrementCount]),
      signature: "0x" as Hex,
    };

    const batchExecuteIncrementCountFromExecutorMessage = encodePacked(
      ["address", "bytes32", "bytes32", "address", "bytes"],
      [
        batchExecuteIncrementCountFromExecutorArgs.account,
        batchExecuteIncrementCountFromExecutorArgs.salt,
        batchExecuteIncrementCountFromExecutorArgs.mode,
        batchExecuteIncrementCountFromExecutorArgs.module,
        batchExecuteIncrementCountFromExecutorArgs.action,
      ],
    );

    batchExecuteIncrementCountFromExecutorArgs.signature = await owner.signMessage({
      message: {
        raw: keccak256(batchExecuteIncrementCountFromExecutorMessage),
      },
    });

    const { request: batchExecuteIncrementCountFromExecutor } = await publicClient.simulateContract({
      address: CounterExecutor.module.address,
      abi: CounterExecutor.abi,
      functionName: "execute",
      args: [
        batchExecuteIncrementCountFromExecutorArgs.account,
        batchExecuteIncrementCountFromExecutorArgs.salt,
        batchExecuteIncrementCountFromExecutorArgs.mode,
        encodePacked(
          ["bytes", "bytes"],
          [
            batchExecuteIncrementCountFromExecutorArgs.signature,
            batchExecuteIncrementCountFromExecutorArgs.action,
          ],
        ),
      ],
      account: admin,
      nonce: await publicClient.getTransactionCount({
        address: admin.address,
        blockTag: "pending",
      }),
    });
    const batchExecuteIncrementCountFromExecutorTxHash = await publicClient.writeContract(batchExecuteIncrementCountFromExecutor);

    const { status: batchExecuteIncrementCountFromExecutorStatus } = await publicClient.waitForTransactionReceipt({
      hash: batchExecuteIncrementCountFromExecutorTxHash,
    });
    expect(batchExecuteIncrementCountFromExecutorStatus).toStrictEqual("success");
    //#endregion
  });
});
