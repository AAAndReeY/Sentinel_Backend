import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ExternalService {
  private logger = new Logger('External');

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {}

  /** Devuelve el personal de Gestionate o `null` si el DNI no existe allá. */
  async getExternalUser(dni: string): Promise<any> {
    const key = this.config.get<string>('EXTERNAL_KEY');
    const route = this.config.get<string>('EXTERNAL_ROUTE');
    if (!key || !route)
      throw new InternalServerErrorException('Varibles internas no definidas');
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${route}/${dni}`, {
          headers: {
            'x-api-key': key,
          },
        }),
      );
      return data?.data ?? null;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (isAxiosError(error)) {
        const status = error.response?.status;
        // 404 de "empleado no encontrado" vs. 404 de Nest por ruta inexistente ("Cannot GET ...")
        const detail = String(error.response?.data?.message ?? '');
        if (status === 404 && !detail.startsWith('Cannot ')) return null;
        this.logger.error(
          `Gestionate respondió ${status ?? error.code}: ${error.message}`,
        );
        if (status === 401 || status === 403)
          throw new BadGatewayException(
            'Gestionate rechazó las credenciales de Sentinel.',
          );
        throw new BadGatewayException(
          'No se pudo consultar Gestionate, inténtalo de nuevo más tarde.',
        );
      }
      throw error;
    }
  }
}
