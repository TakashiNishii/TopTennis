import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Desafio } from './interfaces/desafio.interface';
import { CriarDesafioDto } from './dtos/criar-desafio.dto';
import { JogadoresService } from '../jogadores/jogadores.service';
import { CategoriasService } from '../categorias/categorias.service';
import { DesafioStatus } from './interfaces/desafio-status.enum';
import { AtualizarDesafioDto } from './dtos/atualizar-desafio.dto';

@Injectable()
export class DesafiosService {
  constructor(
    @InjectModel('Desafio') private readonly desafioModel: Model<Desafio>,
    private readonly jogadoresService: JogadoresService,
    private readonly categoriasService: CategoriasService,
  ) {}

  private readonly logger = new Logger(DesafiosService.name);

  async criarDesafio(criarDesafioDto: CriarDesafioDto): Promise<Desafio> {
    const { jogadores, solicitante } = criarDesafioDto;

    const solicitanteNosJogadores = jogadores.find(
      (jogador) => jogador._id == solicitante,
    );

    if (!solicitanteNosJogadores) {
      throw new NotFoundException(
        `Solicitante deve estar entre os jogadores do desafio`,
      );
    }

    if (jogadores[0]._id == jogadores[1]._id) {
      throw new BadRequestException(
        'O desafio deve ser solicitado entre dois jogadores diferentes!',
      );
    }
    await this.jogadoresService.consultarJogadorPeloId(
      jogadores[0]._id as string,
    );
    await this.jogadoresService.consultarJogadorPeloId(
      jogadores[1]._id as string,
    );

    const categoriaSolicitante =
      await this.categoriasService.consultarCategoriaPeloIdJogador(solicitante);

    const desafioCriado = new this.desafioModel(criarDesafioDto);
    desafioCriado.categoria = categoriaSolicitante.categoria;
    desafioCriado.dataHoraSolicitacao = new Date();
    desafioCriado.status = DesafioStatus.PENDENTE;
    return await desafioCriado.save();
  }

  async consultarDesafios(): Promise<Desafio[]> {
    return this.desafioModel.find().exec();
  }

  async consultarDesafioPeloIdJogador(idJogador: any): Promise<Desafio[]> {
    await this.jogadoresService.consultarJogadorPeloId(idJogador);

    const desafiosEncontrado = await this.desafioModel
      .find()
      .where('jogadores')
      .in(idJogador)
      .exec();

    return desafiosEncontrado;
  }

  async atualizarDesafio(
    _id: string,
    atualizarDesafioDto: AtualizarDesafioDto,
  ): Promise<void> {
    const desafioEncontrado = await this.desafioModel.findOne({ _id }).exec();

    if (!desafioEncontrado) {
      throw new NotFoundException(`Desafio ${_id} não foi encontrado`);
    }

    await this.desafioModel
      .findOneAndUpdate({ _id }, { $set: atualizarDesafioDto })
      .exec();
  }

  async deletarDesafio(_id: string): Promise<void> {
    const desafioEncontrado = await this.desafioModel.findOne({ _id }).exec();

    if (!desafioEncontrado) {
      throw new NotFoundException(`Desafio ${_id} não foi encontrado`);
    }

    desafioEncontrado.status = DesafioStatus.CANCELADO;
    await this.desafioModel
      .findOneAndUpdate({ _id }, { $set: desafioEncontrado })
      .exec();
  }
}
