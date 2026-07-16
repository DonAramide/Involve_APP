export declare class PDFService {
    /**
     * Generates a professional, NERDC-compliant PDF for a lesson note.
     */
    static generateLessonNotePDF(note: any, tenantName: string): Promise<Buffer>;
}
