import EventEmitter from 'events';
import deipRpc from '@deip/rpc-client';
import PubSub from 'pubsub-js';
import fs from 'fs';
import util from 'util';
import path from 'path';
import * as protocolService from './../../utils/blockchain';
import ProposalDtoService from './../../services/impl/read/ProposalDtoService';
import assert from 'assert';
import config from './../../config';
import { QUEUE_TOPIC } from './../../constants';
import { APP_PROPOSAL, CreateProposalCmd, UpdateProposalCmd, DeclineProposalCmd } from '@deip/command-models';
import {
  logError,
  logWarn,
  logCmdInfo
} from './../../utils/log';

const proposalDtoService = new ProposalDtoService({ scoped: false });

class BaseCmdHandler extends EventEmitter {

  constructor() {
    super();
  }

  registered = [];

  isRegistered(eventNum) {
    return this.registered.includes(eventNum);
  }

  register(cmdNum, handler) {
    assert(!util.types.isAsyncFunction(handler), "Command handler must be sync due to threads concurrency issue");
    this.registered.push(cmdNum);
    this.on(cmdNum, (cmd, ctx) => {
      try {
        logCmdInfo(`Command ${cmd.getCmdName()} is being handled by ${this.constructor.name} ${ctx.state.proposalsStackFrame ? 'within ' + APP_PROPOSAL[ctx.state.proposalsStackFrame.type] + ' flow (' + ctx.state.proposalsStackFrame.proposalId + ')' : ''}`);
        handler(cmd, ctx);
      } catch(err) {
        logError(`Command ${cmd.getCmdName()} ${ctx.state.proposalsStackFrame ? 'within ' + APP_PROPOSAL[ctx.state.proposalsStackFrame.type] + ' flow (' + ctx.state.proposalsStackFrame.proposalId + ')' : ''} failed with an error:`, err);
        throw err;
      }
    });
  }


  async extractUpdatedProposals(msg) {
    const { tx, appCmds } = msg;

    const newProposalsCmds = [];
    const proposalCmds = appCmds.filter(cmd => {
      return cmd instanceof CreateProposalCmd;
    });

    for (let i = 0; i < proposalCmds.length; i++) {
      let proposalCmd = proposalCmds[i];
      newProposalsCmds.push(proposalCmd);
      extractNestedProposal(proposalCmd, newProposalsCmds);
    }

    function extractNestedProposal(parentProposalCmd, acc) {
      const nestedProposalCmds = parentProposalCmd.getProposedCmds().filter(cmd => {
        return cmd instanceof CreateProposalCmd;
      });
      for (let i = 0; i < nestedProposalCmds.length; i++) {
        let nestedProposalCmd = nestedProposalCmds[i];
        acc.push(nestedProposalCmd);
        extractNestedProposal(nestedProposalCmd, acc);
      }
    }

    const proposalUpdates = [];
    proposalUpdates.push(...appCmds.filter(cmd => {
      return cmd instanceof UpdateProposalCmd || cmd instanceof DeclineProposalCmd;
    }).map(cmd => ({ cmd, isNewProposal: newProposalsCmds.some(proposalCmd => cmd.getCmdPayload().entityId == proposalCmd.getProtocolEntityId()) })));

    for (let i = 0; i < newProposalsCmds.length; i++) {
      let proposalCmd = newProposalsCmds[i];
      proposalUpdates.push(...proposalCmd.getProposedCmds().filter(cmd => {
        return cmd instanceof UpdateProposalCmd || cmd instanceof DeclineProposalCmd;
      }).map(cmd => ({ cmd, isNewProposal: newProposalsCmds.some((proposalCmd) => cmd.getCmdPayload().entityId == proposalCmd.getProtocolEntityId()) })));
    }

    const proposalIds = proposalUpdates.reduce((acc, item) => {
      let { cmd, isNewProposal } = item;
      let { entityId: proposalId } = cmd.getCmdPayload();
      return acc.some(p => p.proposalId === proposalId) ? acc : [...acc, { proposalId, isNewProposal }];
    }, []);

    const proposalsStates = await deipRpc.api.getProposalsStatesAsync(proposalIds.map(({ proposalId }) => proposalId));
    const proposalsDtos = await proposalDtoService.getProposals(proposalIds.filter(({ isNewProposal }) => !isNewProposal).map(({ proposalId }) => proposalId));

    const existedProposals = proposalIds.filter(({ isNewProposal }) => !isNewProposal).map(({ proposalId }) => {
      const proposalDto = proposalsDtos.find(p => p._id === proposalId);
      const proposalsState = proposalsStates.find(p => p.external_id === proposalId);
      const proposalCmd = CreateProposalCmd.Deserialize(proposalDto.cmd);
      const proposedCmds = proposalCmd.getProposedCmds();
      const type = proposalCmd.getProposalType();
      const status = proposalsState.status;
      return {
        proposalId,
        type,
        status,
        proposalCmd,
        proposedCmds
      }
    })

    const createdProposals = proposalIds.filter(({ isNewProposal }) => isNewProposal).map(({ proposalId }) => {
      const proposalsState = proposalsStates.find(p => p.external_id === proposalId);
      const proposalCmd = newProposalsCmds.find(cmd => cmd.getProtocolEntityId() === proposalId);
      const proposedCmds = proposalCmd.getProposedCmds();
      const type = proposalCmd.getProposalType();
      const status = proposalsState.status;
      return {
        proposalId,
        type,
        status,
        proposalCmd,
        proposedCmds
      }
    });

    const result = [...existedProposals, ...createdProposals].reduce((map, p) => {
      map[p.proposalId] = p;
      return map;
    }, {});

    return result;
  }



  async process(msg, ctx, validate = async (cmds) => {}) {
    const { tx, appCmds } = msg;
    
    await validate(appCmds);
    
    if (tx) {
      const signedTx = deipRpc.auth.signTransaction(tx.finalize(), {}, { tenant: config.TENANT, tenantPrivKey: config.TENANT_PRIV_KEY }); // affirm by tenant
      const txInfo = await protocolService.sendTransactionAsync(signedTx);
      const updatedProposals = await this.extractUpdatedProposals(msg); // This async call must be removed after we have blockchain notifications up and running
      ctx.state.updatedProposals = updatedProposals;
    }

    BaseCmdHandler.Dispatch(appCmds, ctx);

    // TODO: save and put events into persistent FIFO queue
    this.logEvents(ctx.state.appEvents);
    PubSub.publishSync(QUEUE_TOPIC.APP_EVENT_TOPIC, ctx.state.appEvents);
  };


  handle(cmd, ctx) {
    this.emit(cmd.getCmdNum(), cmd, ctx);
  }


  static Dispatch(cmds, ctx) {
    const CMD_HANDLERS = require('./../../command-handlers/index');

    for (let i = 0; i < cmds.length; i++) {
      const cmd = cmds[i];
      const cmdHandler = CMD_HANDLERS[cmd.getCmdNum()];
      if (!cmdHandler) {
        logWarn(`WARNING: No command handler registered for ${cmd.getCmdName()} command`);
        continue;
      }

      if (cmdHandler.isRegistered(cmd.getCmdNum())) {
        cmdHandler.handle(cmd, ctx);
      } else {
        logWarn(`WARNING: No command handler registered for ${cmd.getCmdName()} command in ${cmdHandler.constructor.name}`);
      }
    }

  };

  logEvents(events) {
    const EVENTS_LOG_FILE_PATH = path.join(__dirname, `./../../../${config.TENANT_LOG_DIR}/events.log`);

    let log = '';
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      log += `${event.toString()}\r\n`;
    }
    fs.writeFileSync(EVENTS_LOG_FILE_PATH, log, { flag: 'a' }, (err) => {
      console.error(err);
    });
  }

}


module.exports = BaseCmdHandler;