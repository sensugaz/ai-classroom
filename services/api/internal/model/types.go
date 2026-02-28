package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Session struct {
	ID                primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	TeacherName       string             `bson:"teacher_name" json:"teacher_name"`
	ClassName         string             `bson:"class_name" json:"class_name"`
	Subject           string             `bson:"subject" json:"subject"`
	CourseOutline     string             `bson:"course_outline" json:"course_outline"`
	SourceLang        string             `bson:"source_lang" json:"source_lang"`
	TargetLang        string             `bson:"target_lang" json:"target_lang"`
	VoiceType         string             `bson:"voice_type" json:"voice_type"`
	Mode              string             `bson:"mode" json:"mode"` // "realtime" | "push_to_talk"
	NoiseCancellation bool               `bson:"noise_cancellation" json:"noise_cancellation"`
	Status            string             `bson:"status" json:"status"` // "active" | "completed"
	Segments          []Segment          `bson:"segments" json:"segments"`
	Summary           *Summary           `bson:"summary,omitempty" json:"summary,omitempty"`
	Vocabulary        []VocabItem        `bson:"vocabulary,omitempty" json:"vocabulary,omitempty"`
	Flashcards        []Flashcard        `bson:"flashcards,omitempty" json:"flashcards,omitempty"`
	CreatedAt         time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt         time.Time          `bson:"updated_at" json:"updated_at"`
}

type Segment struct {
	Index          int       `bson:"index" json:"index"`
	OriginalText   string    `bson:"original_text" json:"original_text"`
	TranslatedText string    `bson:"translated_text" json:"translated_text"`
	Timestamp      time.Time `bson:"timestamp" json:"timestamp"`
}

type Summary struct {
	Th string `bson:"th" json:"th"`
	En string `bson:"en" json:"en"`
}

type VocabItem struct {
	Th         string `bson:"th" json:"th"`
	En         string `bson:"en" json:"en"`
	Phonetic   string `bson:"phonetic" json:"phonetic"`
	Difficulty string `bson:"difficulty" json:"difficulty"`
	Example    string `bson:"example" json:"example"`
}

type Flashcard struct {
	Front   string `bson:"front" json:"front"`
	Back    string `bson:"back" json:"back"`
	Example string `bson:"example" json:"example"`
}
