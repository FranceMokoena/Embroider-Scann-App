import mongoose, { Document, Types } from 'mongoose';
export interface IScreen extends Document {
    barcode: string;
    status: 'Reparable' | 'Beyond Repair';
    timestamp: Date;
    session: Types.ObjectId;
}
declare const _default: mongoose.Model<IScreen, {}, {}, {}, mongoose.Document<unknown, {}, IScreen, {}, {}> & IScreen & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Screen.d.ts.map