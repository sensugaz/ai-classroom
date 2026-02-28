package model

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type SessionModel struct {
	collection *mongo.Collection
}

func NewSessionModel(db *mongo.Database) *SessionModel {
	return &SessionModel{
		collection: db.Collection("sessions"),
	}
}

// Insert creates a new session in the database.
func (m *SessionModel) Insert(ctx context.Context, session *Session) (*Session, error) {
	now := time.Now()
	session.CreatedAt = now
	session.UpdatedAt = now
	if session.Status == "" {
		session.Status = "active"
	}
	if session.Segments == nil {
		session.Segments = []Segment{}
	}

	result, err := m.collection.InsertOne(ctx, session)
	if err != nil {
		return nil, err
	}

	session.ID = result.InsertedID.(primitive.ObjectID)
	return session, nil
}

// FindOne retrieves a session by its ObjectID.
func (m *SessionModel) FindOne(ctx context.Context, id primitive.ObjectID) (*Session, error) {
	var session Session
	err := m.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&session)
	if err != nil {
		return nil, err
	}
	return &session, nil
}

// Update replaces the session document with the given data.
func (m *SessionModel) Update(ctx context.Context, id primitive.ObjectID, session *Session) error {
	session.UpdatedAt = time.Now()

	update := bson.M{
		"$set": bson.M{
			"teacher_name":       session.TeacherName,
			"class_name":         session.ClassName,
			"subject":            session.Subject,
			"course_outline":     session.CourseOutline,
			"source_lang":        session.SourceLang,
			"target_lang":        session.TargetLang,
			"voice_type":         session.VoiceType,
			"mode":               session.Mode,
			"noise_cancellation": session.NoiseCancellation,
			"status":             session.Status,
			"updated_at":         session.UpdatedAt,
		},
	}

	_, err := m.collection.UpdateOne(ctx, bson.M{"_id": id}, update)
	return err
}

// FindAll retrieves all sessions, sorted by creation date descending.
func (m *SessionModel) FindAll(ctx context.Context) ([]*Session, error) {
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := m.collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var sessions []*Session
	if err := cursor.All(ctx, &sessions); err != nil {
		return nil, err
	}

	if sessions == nil {
		sessions = []*Session{}
	}
	return sessions, nil
}

// AddSegment pushes a new segment onto the session's segments array.
func (m *SessionModel) AddSegment(ctx context.Context, sessionId primitive.ObjectID, segment Segment) error {
	update := bson.M{
		"$push": bson.M{"segments": segment},
		"$set":  bson.M{"updated_at": time.Now()},
	}
	_, err := m.collection.UpdateOne(ctx, bson.M{"_id": sessionId}, update)
	return err
}

// UpdateSummary sets the summary field on a session.
func (m *SessionModel) UpdateSummary(ctx context.Context, sessionId primitive.ObjectID, summary *Summary) error {
	update := bson.M{
		"$set": bson.M{
			"summary":    summary,
			"updated_at": time.Now(),
		},
	}
	_, err := m.collection.UpdateOne(ctx, bson.M{"_id": sessionId}, update)
	return err
}

// UpdateVocabulary sets the vocabulary field on a session.
func (m *SessionModel) UpdateVocabulary(ctx context.Context, sessionId primitive.ObjectID, vocab []VocabItem) error {
	update := bson.M{
		"$set": bson.M{
			"vocabulary":  vocab,
			"updated_at": time.Now(),
		},
	}
	_, err := m.collection.UpdateOne(ctx, bson.M{"_id": sessionId}, update)
	return err
}

// UpdateFlashcards sets the flashcards field on a session.
func (m *SessionModel) UpdateFlashcards(ctx context.Context, sessionId primitive.ObjectID, cards []Flashcard) error {
	update := bson.M{
		"$set": bson.M{
			"flashcards":  cards,
			"updated_at": time.Now(),
		},
	}
	_, err := m.collection.UpdateOne(ctx, bson.M{"_id": sessionId}, update)
	return err
}
