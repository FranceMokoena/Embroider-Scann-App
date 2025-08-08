import mongoose, { Document, Types } from 'mongoose';
export interface ITaskSession extends Document {
    technician: Types.ObjectId;
    startTime: Date;
    endTime?: Date;
}
declare const _default: mongoose.Model<ITaskSession, {}, {}, {}, mongoose.Document<unknown, {}, ITaskSession, {}, {}> & ITaskSession & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=TaskSession.d.ts.map