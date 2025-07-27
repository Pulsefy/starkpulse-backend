import { PartialType } from "@nestjs/mapped-types"
import { CreateValidatorDto } from "./create-validator.dto"

export class UpdateValidatorDto extends PartialType(CreateValidatorDto) {}
