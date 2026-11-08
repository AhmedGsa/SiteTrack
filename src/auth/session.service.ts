import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from './entities/session.entity';
import { Hash } from './utils/hash';

@Injectable()
export class SessionService {
    constructor(
        @InjectRepository(Session) private readonly sessionRepository: Repository<Session>,
    ) {}

    async create(userId: number, refreshToken: string) {
        const session = this.sessionRepository.create({
            userId,
            refreshTokenHash: await Hash.hash(refreshToken),
        });
        return await this.sessionRepository.save(session);
    }

    async findOne(id: number) {
        return await this.sessionRepository.findOneBy({ id });
    }

    async rotate(sessionId: number, refreshToken: string) {
        const session = await this.sessionRepository.findOneBy({ id: sessionId });
        if (!session) {
            throw new UnauthorizedException();
        }
        session.refreshTokenHash = await Hash.hash(refreshToken);
        return await this.sessionRepository.save(session);
    }

    async validateRefreshToken(sessionId: number, refreshToken: string) {
        const session = await this.sessionRepository.findOneBy({ id: sessionId });
        if (!session) {
            return null;
        }
        const isValid = await Hash.compare(refreshToken, session.refreshTokenHash);
        if (!isValid) {
            return null;
        }
        return session;
    }

    async remove(id: number) {
        await this.sessionRepository.delete(id);
    }
}
