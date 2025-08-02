import { Injectable, NotFoundException } from "@nestjs/common"
import type { Repository } from "typeorm"
import { type ValidationTask, TaskStatus, type TaskPriority } from "../entities/validation-task.entity"

export interface CreateValidationTaskDto {
  contentItemId: string
  requiredValidators: number
  priority: TaskPriority
  rewardAmount: number
  validationCriteria: Record<string, any>
  specialRequirements?: string[]
}

@Injectable()
export class ValidationTaskService {
  private taskRepository: Repository<ValidationTask>

  constructor(taskRepository: Repository<ValidationTask>) {
    this.taskRepository = taskRepository
  }

  async createValidationTask(dto: CreateValidationTaskDto): Promise<ValidationTask> {
    const deadline = new Date()
    deadline.setHours(deadline.getHours() + 24) // 24 hours deadline

    const task = this.taskRepository.create({
      ...dto,
      deadline,
      status: TaskStatus.PENDING,
    })

    return await this.taskRepository.save(task)
  }

  async findOne(id: string): Promise<ValidationTask> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ["contentItem", "validationResults", "consensus"],
    })

    if (!task) {
      throw new NotFoundException("Validation task not found")
    }

    return task
  }

  async findByContentId(contentItemId: string): Promise<ValidationTask[]> {
    return await this.taskRepository.find({
      where: { contentItemId },
      relations: ["validationResults", "consensus"],
      order: { createdAt: "DESC" },
    })
  }

  async updateStatus(id: string, status: TaskStatus): Promise<ValidationTask> {
    const task = await this.findOne(id)
    task.status = status
    return await this.taskRepository.save(task)
  }

  async getPendingTasks(): Promise<ValidationTask[]> {
    return await this.taskRepository.find({
      where: { status: TaskStatus.PENDING },
      relations: ["contentItem"],
      order: { priority: "DESC", createdAt: "ASC" },
    })
  }

  async assignValidator(taskId: string): Promise<ValidationTask> {
    const task = await this.findOne(taskId)
    task.assignedValidators += 1

    if (task.assignedValidators >= task.requiredValidators) {
      task.status = TaskStatus.IN_PROGRESS
    } else {
      task.status = TaskStatus.ASSIGNED
    }

    return await this.taskRepository.save(task)
  }
}
