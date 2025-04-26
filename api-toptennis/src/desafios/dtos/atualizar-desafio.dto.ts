import { IsDateString, IsEnum, IsIn, IsOptional } from 'class-validator';
import { DesafioStatus } from '../interfaces/desafio-status.enum';

export class AtualizarDesafioDto {
  @IsDateString()
  @IsOptional()
  dataHoraDesafio: Date;

  @IsEnum(DesafioStatus)
  @IsIn([DesafioStatus.ACEITO, DesafioStatus.CANCELADO, DesafioStatus.NEGADO])
  @IsOptional()
  status: DesafioStatus;
}
