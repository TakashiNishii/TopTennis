import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { DesafiosService } from './desafios.service';
import { CriarDesafioDto } from './dtos/criar-desafio.dto';
import { Desafio } from './interfaces/desafio.interface';
import { AtualizarDesafioDto } from './dtos/atualizar-desafio.dto';
import { ValidacaoParametrosPipe } from '../common/pipes/validacao-parametros.pipe';

@Controller('api/v1/desafios')
export class DesafiosController {
  constructor(private readonly desafiosService: DesafiosService) {}

  private readonly logger = new Logger(DesafiosController.name);

  @Post()
  @UsePipes(ValidationPipe)
  async criarDesafios(
    @Body() criarDesafiosDto: CriarDesafioDto,
  ): Promise<Desafio> {
    return await this.desafiosService.criarDesafio(criarDesafiosDto);
  }

  @Get()
  async consultarDesafios(
    @Query('idJogador') idJogador?: string,
  ): Promise<Array<Desafio>> {
    if (idJogador) {
      return this.desafiosService.consultarDesafioPeloIdJogador(idJogador);
    }
    return this.desafiosService.consultarDesafios();
  }

  @Put('/:idDesafio')
  @UsePipes(ValidationPipe)
  async atualizarDesafio(
    @Body() atualizarDesafioDto: AtualizarDesafioDto,
    @Param('idDesafio', ValidacaoParametrosPipe) idDesafio: string,
  ): Promise<void> {
    await this.desafiosService.atualizarDesafio(idDesafio, atualizarDesafioDto);
  }

  @Delete('/:idDesafio')
  @UsePipes(ValidationPipe)
  async deletarDesafio(
    @Param('idDesafio', ValidacaoParametrosPipe) idDesafio: string,
  ): Promise<void> {
    await this.desafiosService.deletarDesafio(idDesafio);
  }
}
