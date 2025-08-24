import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets"
import type { Server, Socket } from "socket.io"
import { Logger } from "@nestjs/common"

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class ValidationGateway {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(ValidationGateway.name)

  handleJoinValidatorRoom(client: Socket, data: { validatorId: string }) {
    client.join(`validator_${data.validatorId}`)
    this.logger.log(`Validator ${data.validatorId} joined room`)
  }

  handleJoinTaskRoom(client: Socket, data: { taskId: string }) {
    client.join(`task_${data.taskId}`)
    this.logger.log(`Client joined task room: ${data.taskId}`)
  }

  notifyNewValidationTask(taskId: string, task: any) {
    this.server.emit("newValidationTask", { taskId, task })
  }

  notifyValidationCompleted(taskId: string, result: any) {
    this.server.to(`task_${taskId}`).emit("validationCompleted", { taskId, result })
  }

  notifyConsensusReached(taskId: string, consensus: any) {
    this.server.to(`task_${taskId}`).emit("consensusReached", { taskId, consensus })
  }

  notifyReputationUpdate(validatorId: string, update: any) {
    this.server.to(`validator_${validatorId}`).emit("reputationUpdate", update)
  }

  notifyRewardDistributed(validatorId: string, reward: any) {
    this.server.to(`validator_${validatorId}`).emit("rewardDistributed", reward)
  }
}
