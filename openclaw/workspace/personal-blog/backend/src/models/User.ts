import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Post } from './Post';
import { Comment } from './Comment';
import { Like } from './Like';
import { AiPromptPreset } from './AiPromptPreset';
import { Follow } from './Follow';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  openid: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  unionid: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  password: string;

  @Column({ type: 'varchar', length: 100 })
  nickname: string;

  @Column({ type: 'varchar', nullable: true })
  avatar: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  gender: string;

  @Column({ type: 'date', nullable: true })
  birthday: Date;

  @Column({ type: 'varchar', length: 20, default: 'createdAt', name: 'display_time_preference' })
  displayTimePreference: string;

  @Column({ type: 'varchar', length: 10, default: 'desc', name: 'display_order_preference' })
  displayOrderPreference: string;

  @Column({ type: 'varchar', length: 36, nullable: true, name: 'ai_prompt_preset_id' })
  aiPromptPresetId: string;

  @Column({ type: 'varchar', default: 'user' })
  role: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'ollama_base_url' })
  ollamaBaseUrl: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'ollama_model' })
  ollamaModel: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'custom_api_url' })
  customApiUrl: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'custom_api_model' })
  customApiModel: string;

  @Column({ type: 'varchar', length: 100, default: 'ollama', name: 'ai_provider' })
  aiProvider: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Post, (post) => post.user)
  posts: Post[];

  @OneToMany(() => Comment, (comment) => comment.user)
  comments: Comment[];

  @OneToMany(() => Like, (like) => like.user)
  likes: Like[];

  @OneToMany(() => AiPromptPreset, (preset) => preset.user)
  aiPromptPresets: AiPromptPreset[];

  @OneToMany(() => Follow, (follow) => follow.follower)
  following: Follow[];

  @OneToMany(() => Follow, (follow) => follow.following)
  followers: Follow[];
}
