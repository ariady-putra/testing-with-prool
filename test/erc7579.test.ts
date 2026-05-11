import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createPublicClient, encodePacked, Hex, http, keccak256, walletActions } from "viem";
import { expect, describe } from "vitest";
import { toNexusSmartAccount } from "permissionless/accounts";
import { testWithRpc } from "../utils/testWithRpc";
import { createSmartAccountClient } from "permissionless";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { foundry } from "viem/chains";
import { erc7579Actions, InstallModuleParameters } from "permissionless/actions/erc7579";
import { SmartAccount } from "viem/account-abstraction";
import { pk } from "../utils/getInstances";
import { Action, encodeBatch, encodeExecuteBatch, encodeExecuteSingle, encodeMode, encodeSingle } from "../utils/erc7579";
import { CALLTYPE } from "../erc7579/calltype";
import { EXECTYPE } from "../erc7579/exectype";
import CounterExecutorModuleJSON from "../CounterExecutorModule.json";

describe("ERC-7579 test cases", () => {
  testWithRpc("Can install module", async ({ rpc }) => {
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

    const account = await toNexusSmartAccount({
      client: publicClient,
      owners: [owner],
      version: "1.0.0",
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

    const counterExecutorModule: InstallModuleParameters<SmartAccount> = {
      type: "executor",
      address: "0x7A430Dd4b082365FDd106D674a5487dD0dE25441",
      context: owner.address,
    };

    const CounterExecutor = {
      ...CounterExecutorModuleJSON,
      module: counterExecutorModule,
    };

    // const installModuleOpHash =
    await smartAccountClient.installModule(CounterExecutor.module);
    // console.log({ installModuleOpHash });

    // const installModuleReceipt = await pimlicoClient.waitForUserOperationReceipt({
    //   hash: installModuleOpHash,
    // });
    // expect(installModuleReceipt.success).to.be.true;

    // const { transactionHash: installModuleTxHash } = (
    //   await pimlicoClient.request({
    //     method: "eth_getUserOperationByHash",
    //     params: [installModuleReceipt.userOpHash],
    //   })
    // )!;

    // const { status: installModuleStatus } = await publicClient.waitForTransactionReceipt({
    //   hash: installModuleTxHash,
    // });
    // expect(installModuleStatus).to.be.true;

    await new Promise(
      (resolve) => setTimeout(
        () => smartAccountClient
          .isModuleInstalled(CounterExecutor.module)
          .then(
            (isCounterExecutorModuleInstalled) => {
              // console.log({ isCounterExecutorModuleInstalled });
              expect(isCounterExecutorModuleInstalled).to.be.true;
            }
          )
          .finally(
            () => resolve(0)
          ),
        12_000,
      )
    );
  });

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

    const account = await toNexusSmartAccount({
      client: publicClient,
      owners: [owner],
      version: "1.0.0",
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

    const counterExecutorModule: InstallModuleParameters<SmartAccount> = {
      type: "executor",
      address: "0x7A430Dd4b082365FDd106D674a5487dD0dE25441",
      context: owner.address,
    };

    const CounterExecutor = {
      ...CounterExecutorModuleJSON,
      module: counterExecutorModule,
    };

    // const installModuleOpHash =
    await smartAccountClient.installModule(CounterExecutor.module);

    const incrementCount: Action = {
      target: CounterExecutor.module.address,
      value: 0n,
      data: {
        abi: CounterExecutor.abi,
        functionName: "incrementCount",
      },
    };

    await new Promise(
      (resolve) => setTimeout(
        () => (async () => {
          const incrementCountTxHash = await smartAccountClient.sendTransaction({
            callData: encodeExecuteSingle(incrementCount),
          });

          const { status: incrementCountStatus } = await publicClient.waitForTransactionReceipt({
            hash: incrementCountTxHash,
          });
          expect(incrementCountStatus).toStrictEqual("success");
        })().finally(
          () => resolve(0)
        ),
        12_000,
      )
    );
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

    const account = await toNexusSmartAccount({
      client: publicClient,
      owners: [owner],
      version: "1.0.0",
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

    const counterExecutorModule: InstallModuleParameters<SmartAccount> = {
      type: "executor",
      address: "0x7A430Dd4b082365FDd106D674a5487dD0dE25441",
      context: owner.address,
    };

    const CounterExecutor = {
      ...CounterExecutorModuleJSON,
      module: counterExecutorModule,
    };

    // const installModuleOpHash =
    await smartAccountClient.installModule(CounterExecutor.module);

    const incrementCount: Action = {
      target: CounterExecutor.module.address,
      value: 0n,
      data: {
        abi: CounterExecutor.abi,
        functionName: "incrementCount",
      },
    };

    await new Promise(
      (resolve) => setTimeout(
        () => (async () => {
          const incrementCountTxHash = await smartAccountClient.sendTransaction({
            callData: encodeExecuteBatch([incrementCount, incrementCount, incrementCount]),
          });

          const { status: incrementCountStatus } = await publicClient.waitForTransactionReceipt({
            hash: incrementCountTxHash,
          });
          expect(incrementCountStatus).toStrictEqual("success");
        })().finally(
          () => resolve(0)
        ),
        12_000,
      )
    );
  });

  testWithRpc("Can execute single from executor", async ({ rpc }) => {
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

    const account = await toNexusSmartAccount({
      client: publicClient,
      owners: [owner],
      version: "1.0.0",
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

    const counterExecutorModule: InstallModuleParameters<SmartAccount> = {
      type: "executor",
      address: "0x7A430Dd4b082365FDd106D674a5487dD0dE25441",
      context: owner.address,
    };

    const CounterExecutor = {
      ...CounterExecutorModuleJSON,
      module: counterExecutorModule,
    };

    await smartAccountClient.installModule(CounterExecutor.module);

    const incrementCount: Action = {
      target: CounterExecutor.module.address,
      value: 0n,
      data: {
        abi: CounterExecutor.abi,
        functionName: "incrementCount",
      },
    };

    await new Promise(
      (resolve) => setTimeout(
        () => (async () => {
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
            account: privateKeyToAccount(pk[pk.length - 1]),
          });
          const executeIncrementCountFromExecutorTxHash = await publicClient.writeContract(executeIncrementCountFromExecutor);

          const { status: executeIncrementCountFromExecutorStatus } = await publicClient.waitForTransactionReceipt({
            hash: executeIncrementCountFromExecutorTxHash,
          });
          expect(executeIncrementCountFromExecutorStatus).toStrictEqual("success");
        })().finally(
          () => resolve(0)
        ),
        12_000,
      )
    );
  });

  testWithRpc("Can execute batch from executor", async ({ rpc }) => {
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

    const account = await toNexusSmartAccount({
      client: publicClient,
      owners: [owner],
      version: "1.0.0",
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

    const counterExecutorModule: InstallModuleParameters<SmartAccount> = {
      type: "executor",
      address: "0x7A430Dd4b082365FDd106D674a5487dD0dE25441",
      context: owner.address,
    };

    const CounterExecutor = {
      ...CounterExecutorModuleJSON,
      module: counterExecutorModule,
    };

    await smartAccountClient.installModule(CounterExecutor.module);

    const incrementCount: Action = {
      target: CounterExecutor.module.address,
      value: 0n,
      data: {
        abi: CounterExecutor.abi,
        functionName: "incrementCount",
      },
    };

    await new Promise(
      (resolve) => setTimeout(
        () => (async () => {
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
            account: privateKeyToAccount(pk[pk.length - 1]),
          });
          const batchExecuteIncrementCountFromExecutorTxHash = await publicClient.writeContract(batchExecuteIncrementCountFromExecutor);

          const { status: batchExecuteIncrementCountFromExecutorStatus } = await publicClient.waitForTransactionReceipt({
            hash: batchExecuteIncrementCountFromExecutorTxHash,
          });
          expect(batchExecuteIncrementCountFromExecutorStatus).toStrictEqual("success");
        })().finally(
          () => resolve(0)
        ),
        12_000,
      )
    );
  });
});
