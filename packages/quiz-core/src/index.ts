export interface QuizQuestion {
  id: string;
  questionText: string;
}
export interface QuizGenerator {
  generate(): Promise<QuizQuestion[]>;
}
export interface QuizGrader {
  grade(): Promise<unknown>;
}
