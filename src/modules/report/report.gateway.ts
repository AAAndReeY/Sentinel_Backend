import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class ReportGateway {
  @WebSocketServer()
  server: Server;

  emitReportStatusChanged(report: any) {
    this.server.emit('report_status_changed');
  }

  emitReportStatusValidate(report: any) {
    this.server.emit('report_status_validate');
  }
}
