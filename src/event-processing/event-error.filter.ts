import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";

@Catch()
export class EventProcessingErrorFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    // Custom error handling logic
  }
}