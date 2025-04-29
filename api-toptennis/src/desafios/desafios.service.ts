import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Desafio, Partida } from './interfaces/desafio.interface';
import { CriarDesafioDto } from './dtos/criar-desafio.dto';
import { JogadoresService } from '../jogadores/jogadores.service';
import { CategoriasService } from '../categorias/categorias.service';
import { DesafioStatus } from './interfaces/desafio-status.enum';
import { AtualizarDesafioDto } from './dtos/atualizar-desafio.dto';
import { AtribuirDesafioPartidaDto } from './dtos/atribuir-desafio-partida.dto';

@Injectable()
export class DesafiosService {
  constructor(
    @InjectModel('Desafio') private readonly desafioModel: Model<Desafio>,
    @InjectModel('Partida') private readonly partidaModel: Model<Partida>,
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
    return this.desafioModel
      .find()
      .populate('solicitante')
      .populate('jogadores')
      .populate('partida')
      .exec();
  }

  async consultarDesafioPeloIdJogador(idJogador: any): Promise<Desafio[]> {
    await this.jogadoresService.consultarJogadorPeloId(idJogador);

    const desafiosEncontrado = await this.desafioModel
      .find()
      .where('jogadores')
      .in(idJogador)
      .populate('solicitante')
      .populate('jogadores')
      .populate('partida')
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

  async atribuirDesafioPartida(
    _id: string,
    atribuirDesafioPartidaDto: AtribuirDesafioPartidaDto,
  ): Promise<void> {
    const desafioEncontrado = await this.desafioModel.findById(_id).exec();

    if (!desafioEncontrado) {
      throw new BadRequestException(`Desafio ${_id} não cadastrado!`);
    }

    /*
    Verificar se o jogador vencedor faz parte do desafio
    */
    const jogadorFilter = desafioEncontrado.jogadores.filter(
      (jogador) => jogador._id == atribuirDesafioPartidaDto.def,
    );

    if (jogadorFilter.length == 0) {
      throw new BadRequestException(
        `O jogador vencedor não faz parte do desafio!`,
      );
    }

    /*
    Primeiro vamos criar e persistir o objeto partida
    */
    const partidaCriada = new this.partidaModel(atribuirDesafioPartidaDto);

    /*
    Atribuir ao objeto partida a categoria recuperada no desafio
   */
    partidaCriada.categoria = desafioEncontrado.categoria;

    /*
    Atribuir ao objeto partida os jogadores que fizeram parte do desafio
   */
    partidaCriada.jogadores = desafioEncontrado.jogadores;

    const resultado = await partidaCriada.save();

    /*
    Quando uma partida for registrada por um usuário, mudaremos o 
    status do desafio para realizado
    */
    desafioEncontrado.status = DesafioStatus.REALIZADO;

    /*  
    Recuperamos o ID da partida e atribuimos ao desafio
    */
    desafioEncontrado.partida = resultado._id as Partida;

    try {
      await this.desafioModel
        .findOneAndUpdate({ _id }, { $set: desafioEncontrado })
        .exec();
    } catch (error) {
      /*
        Se a atualização do desafio falhar excluímos a partida 
        gravada anteriormente
        */
      console.log(error);
      await this.partidaModel.deleteOne({ _id: resultado._id }).exec();
      throw new InternalServerErrorException();
    }
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
