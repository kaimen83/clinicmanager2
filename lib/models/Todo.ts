import mongoose, { Schema, Document, models, model } from 'mongoose';

export interface ITodo extends Document {
    userId: string;
    title: string;
    description?: string;
    completed: boolean;
    priority: 'low' | 'medium' | 'high';
    category?: string;
    dueDate?: Date;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

const todoSchema = new Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    completed: {
        type: Boolean,
        default: false
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    category: {
        type: String,
        trim: true
    },
    dueDate: {
        type: Date
    },
    order: {
        type: Number,
        default: 0
    }
}, { 
    timestamps: true
});

// 복합 인덱스 생성
todoSchema.index({ userId: 1, completed: 1, createdAt: -1 });
todoSchema.index({ userId: 1, order: 1 });

const Todo = models.Todo || model<ITodo>('Todo', todoSchema);

export default Todo;