from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models import CommunityComment, CommunityLike, CommunityPost, User
from app.schemas.community import (
    CommentCreate,
    CommentResponse,
    PostCreate,
    PostResponse,
    PostUpdate,
)


router = APIRouter()


def _user_name(u: Optional[User]) -> Optional[str]:
    if not u:
        return None
    return f"{u.first_name or ''} {u.last_name or ''}".strip() or u.email


def _post_resp(p: CommunityPost, comment_count: int) -> PostResponse:
    return PostResponse(
        id=p.id,
        user_id=p.user_id,
        user_name=_user_name(p.user),
        title=p.title,
        content=p.content,
        images=p.images,
        tags=p.tags,
        city_id=p.city_id,
        likes_count=p.likes_count,
        comments_count=comment_count,
        created_at=p.created_at,
    )


@router.get("/posts", response_model=List[PostResponse])
def list_posts(
    search: Optional[str] = None,
    tag: Optional[str] = None,
    city_id: Optional[int] = None,
    sort: str = Query(default="-created_at"),
    db: Session = Depends(get_db),
):
    q = db.query(CommunityPost)
    if search:
        like = f"%{search.lower()}%"
        q = q.filter(
            or_(func.lower(CommunityPost.title).like(like), func.lower(CommunityPost.content).like(like))
        )
    if city_id:
        q = q.filter(CommunityPost.city_id == city_id)
    sort_col = sort.lstrip("-")
    direction = "desc" if sort.startswith("-") else "asc"
    if sort_col not in ("created_at", "likes_count"):
        sort_col = "created_at"
    col = getattr(CommunityPost, sort_col)
    q = q.order_by(col.desc() if direction == "desc" else col.asc())
    rows = q.all()
    out = []
    for p in rows:
        if tag and (not p.tags or tag not in p.tags):
            continue
        cc = db.query(CommunityComment).filter_by(post_id=p.id).count()
        out.append(_post_resp(p, cc))
    return out


@router.post("/posts", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
def create_post(
    payload: PostCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = CommunityPost(user_id=user.id, **payload.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return _post_resp(p, 0)


@router.get("/posts/{post_id}", response_model=PostResponse)
def get_post(post_id: str, db: Session = Depends(get_db)):
    p = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    cc = db.query(CommunityComment).filter_by(post_id=post_id).count()
    return _post_resp(p, cc)


@router.put("/posts/{post_id}", response_model=PostResponse)
def update_post(
    post_id: str,
    payload: PostUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    if p.user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your post")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    cc = db.query(CommunityComment).filter_by(post_id=post_id).count()
    return _post_resp(p, cc)


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    if p.user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your post")
    db.delete(p)
    db.commit()


@router.post("/posts/{post_id}/like")
def like(
    post_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    existing = db.query(CommunityLike).filter_by(user_id=user.id, post_id=post_id).first()
    if existing:
        db.delete(existing)
        p.likes_count = max(0, p.likes_count - 1)
        db.commit()
        return {"liked": False, "likes_count": p.likes_count}
    db.add(CommunityLike(user_id=user.id, post_id=post_id))
    p.likes_count += 1
    db.commit()
    return {"liked": True, "likes_count": p.likes_count}


@router.get("/posts/{post_id}/comments", response_model=List[CommentResponse])
def list_comments(post_id: str, db: Session = Depends(get_db)):
    rows = (
        db.query(CommunityComment)
        .filter_by(post_id=post_id)
        .order_by(CommunityComment.created_at)
        .all()
    )
    return [
        CommentResponse(
            id=c.id,
            post_id=c.post_id,
            user_id=c.user_id,
            user_name=_user_name(db.query(User).get(c.user_id)),
            content=c.content,
            created_at=c.created_at,
        )
        for c in rows
    ]


@router.post("/posts/{post_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def add_comment(
    post_id: str,
    payload: CommentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not db.query(CommunityPost).filter(CommunityPost.id == post_id).first():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    c = CommunityComment(post_id=post_id, user_id=user.id, content=payload.content)
    db.add(c)
    db.commit()
    db.refresh(c)
    return CommentResponse(
        id=c.id,
        post_id=c.post_id,
        user_id=c.user_id,
        user_name=_user_name(user),
        content=c.content,
        created_at=c.created_at,
    )
