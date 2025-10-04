import type { FastifyInstance, FastifyRequest } from "fastify";

export type ViewsListQuery = {
  page?: number;
  page_size?: number;
  search?: string;
};

export type ViewsIdParams = {
  id: string;
};

export type ViewsCreateBody = {
  name: string;
  config: Record<string, unknown>;
};

export type ViewsUpdateBody = {
  name?: string;
  config?: Record<string, unknown>;
};

export type ReportView = {
  id: string;
  userId: string;
  name: string;
  config: Record<string, unknown>;
  createdAt: string | Date;
};

export type ViewsListReply = {
  page: number;
  page_size: number;
  total: number;
  rows: ReportView[];
};

declare module "fastify" {
  interface FastifyInstance {
    prisma: {
      reportView: {
        findMany: (args: any) => Promise<ReportView[]>;
        count: (args: any) => Promise<number>;
        create: (args: any) => Promise<ReportView>;
        update: (args: any) => Promise<ReportView>;
        delete: (args: any) => Promise<void>;
        findUnique: (args: any) => Promise<ReportView | null>;
        findFirst: (args: any) => Promise<ReportView | null>;
      };
    };
    authenticate: (req: FastifyRequest, reply: any) => Promise<void>;
  }

  interface FastifyRequest {
    user?: { sub?: string; id?: string };
  }
}
